from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime
from app.database import tenants_col, payments_col, leases_col, units_col, maintenance_col
from app.auth import get_current_user

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


class TenantCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    id_proof_type: Optional[str] = ""
    id_proof_number: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    occupation: Optional[str] = ""
    move_in_date: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    occupation: Optional[str] = None
    move_in_date: Optional[str] = None


def serialize(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/")
async def list_tenants(
    search: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    cursor = tenants_col.find(query).sort("created_at", -1)
    tenants = []
    async for tenant in cursor:
        tenant = serialize(tenant)
        # Get current lease/unit info
        lease = await leases_col.find_one({"tenant_id": tenant["_id"], "status": "active"})
        if lease:
            tenant["current_unit"] = lease.get("unit_number", "")
            tenant["current_property_id"] = lease.get("property_id", "")
        tenants.append(tenant)
    return tenants


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str, current_user=Depends(get_current_user)):
    tenant = await tenants_col.find_one({"_id": ObjectId(tenant_id)})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant = serialize(tenant)
    # Get active lease
    lease = await leases_col.find_one({"tenant_id": tenant["_id"], "status": "active"})
    if lease:
        lease["_id"] = str(lease["_id"])
        tenant["active_lease"] = lease
    # Get maintenance requests
    maint_cursor = maintenance_col.find({"tenant_id": tenant["_id"]}).sort("created_at", -1).limit(10)
    maint = []
    async for m in maint_cursor:
        m["_id"] = str(m["_id"])
        maint.append(m)
    tenant["maintenance_requests"] = maint
    return tenant


@router.get("/{tenant_id}/payments")
async def tenant_payments(tenant_id: str, current_user=Depends(get_current_user)):
    # Get all leases for this tenant
    leases = []
    async for lease in leases_col.find({"tenant_id": tenant_id}):
        leases.append(str(lease["_id"]))

    if not leases:
        return []

    cursor = payments_col.find({"lease_id": {"$in": leases}}).sort("created_at", -1)
    payments = []
    async for payment in cursor:
        payment["_id"] = str(payment["_id"])
        payments.append(payment)
    return payments


@router.post("/")
async def create_tenant(data: TenantCreate, current_user=Depends(get_current_user)):
    doc = data.dict()
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    try:
        result = await tenants_col.insert_one(doc)
    except Exception as e:
        if "duplicate key" in str(e):
            raise HTTPException(status_code=400, detail="Phone number already exists")
        raise
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data["updated_at"] = datetime.utcnow()
    await tenants_col.update_one({"_id": ObjectId(tenant_id)}, {"$set": update_data})
    tenant = await tenants_col.find_one({"_id": ObjectId(tenant_id)})
    return serialize(tenant)


@router.delete("/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user=Depends(get_current_user)):
    result = await tenants_col.delete_one({"_id": ObjectId(tenant_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"message": "Tenant deleted"}
