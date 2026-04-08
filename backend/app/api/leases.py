from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime, timedelta
from app.database import leases_col, units_col, tenants_col, properties_col
from app.auth import get_current_user

router = APIRouter(prefix="/api/leases", tags=["leases"])


class LeaseCreate(BaseModel):
    property_id: str
    unit_number: str
    tenant_id: str
    start_date: str
    end_date: str
    rent_amount: float
    deposit_amount: Optional[float] = 0
    terms: Optional[str] = ""


def serialize(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/")
async def list_leases(
    status: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    query = {}
    if status:
        query["status"] = status

    cursor = leases_col.find(query).sort("created_at", -1)
    leases = []
    async for lease in cursor:
        lease = serialize(lease)
        # Enrich with tenant and property names
        if lease.get("tenant_id"):
            try:
                tenant = await tenants_col.find_one({"_id": ObjectId(lease["tenant_id"])})
                if tenant:
                    lease["tenant_name"] = tenant.get("name", "")
            except Exception:
                pass
        if lease.get("property_id"):
            try:
                prop = await properties_col.find_one({"_id": ObjectId(lease["property_id"])})
                if prop:
                    lease["property_name"] = prop.get("name", "")
            except Exception:
                pass
        leases.append(lease)
    return leases


@router.get("/expiring-soon")
async def expiring_soon(current_user=Depends(get_current_user)):
    threshold = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    cursor = leases_col.find({
        "status": "active",
        "end_date": {"$gte": today, "$lte": threshold},
    }).sort("end_date", 1)

    leases = []
    async for lease in cursor:
        lease = serialize(lease)
        if lease.get("tenant_id"):
            try:
                tenant = await tenants_col.find_one({"_id": ObjectId(lease["tenant_id"])})
                if tenant:
                    lease["tenant_name"] = tenant.get("name", "")
            except Exception:
                pass
        if lease.get("property_id"):
            try:
                prop = await properties_col.find_one({"_id": ObjectId(lease["property_id"])})
                if prop:
                    lease["property_name"] = prop.get("name", "")
            except Exception:
                pass
        leases.append(lease)
    return leases


@router.get("/{lease_id}")
async def get_lease(lease_id: str, current_user=Depends(get_current_user)):
    lease = await leases_col.find_one({"_id": ObjectId(lease_id)})
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    lease = serialize(lease)
    if lease.get("tenant_id"):
        try:
            tenant = await tenants_col.find_one({"_id": ObjectId(lease["tenant_id"])})
            if tenant:
                lease["tenant_name"] = tenant.get("name", "")
        except Exception:
            pass
    if lease.get("property_id"):
        try:
            prop = await properties_col.find_one({"_id": ObjectId(lease["property_id"])})
            if prop:
                lease["property_name"] = prop.get("name", "")
        except Exception:
            pass
    return lease


@router.post("/")
async def create_lease(data: LeaseCreate, current_user=Depends(get_current_user)):
    # Check if unit is vacant
    unit = await units_col.find_one({
        "property_id": data.property_id,
        "unit_number": data.unit_number,
    })
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    if unit.get("status") == "occupied":
        raise HTTPException(status_code=400, detail="Unit is already occupied")

    doc = data.dict()
    doc["status"] = "active"
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    result = await leases_col.insert_one(doc)

    # Mark unit as occupied
    await units_col.update_one(
        {"_id": unit["_id"]},
        {"$set": {"status": "occupied", "current_tenant_id": data.tenant_id, "updated_at": datetime.utcnow()}},
    )

    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{lease_id}/terminate")
async def terminate_lease(lease_id: str, current_user=Depends(get_current_user)):
    lease = await leases_col.find_one({"_id": ObjectId(lease_id)})
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    if lease["status"] != "active":
        raise HTTPException(status_code=400, detail="Lease is not active")

    await leases_col.update_one(
        {"_id": ObjectId(lease_id)},
        {"$set": {"status": "terminated", "terminated_at": datetime.utcnow(), "updated_at": datetime.utcnow()}},
    )

    # Mark unit as vacant
    await units_col.update_one(
        {"property_id": lease["property_id"], "unit_number": lease["unit_number"]},
        {"$set": {"status": "vacant", "current_tenant_id": None, "updated_at": datetime.utcnow()}},
    )

    return {"message": "Lease terminated successfully"}
