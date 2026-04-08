from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime
from app.database import units_col, tenants_col
from app.auth import get_current_user

router = APIRouter(prefix="/api/units", tags=["units"])


class UnitCreate(BaseModel):
    property_id: str
    unit_number: str
    floor: Optional[int] = 0
    bedrooms: Optional[int] = 1
    bathrooms: Optional[int] = 1
    area_sqft: Optional[float] = 0
    rent_amount: float
    deposit_amount: Optional[float] = 0
    status: Optional[str] = "vacant"
    current_tenant_id: Optional[str] = None


class UnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    floor: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_sqft: Optional[float] = None
    rent_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    status: Optional[str] = None
    current_tenant_id: Optional[str] = None


def serialize(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/")
async def list_units(current_user=Depends(get_current_user)):
    cursor = units_col.find().sort("unit_number", 1)
    units = []
    async for unit in cursor:
        units.append(serialize(unit))
    return units


@router.get("/vacant")
async def list_vacant_units(current_user=Depends(get_current_user)):
    cursor = units_col.find({"status": "vacant"}).sort("unit_number", 1)
    units = []
    async for unit in cursor:
        units.append(serialize(unit))
    return units


@router.get("/property/{property_id}")
async def list_units_by_property(property_id: str, current_user=Depends(get_current_user)):
    cursor = units_col.find({"property_id": property_id}).sort("unit_number", 1)
    units = []
    async for unit in cursor:
        unit = serialize(unit)
        if unit.get("current_tenant_id"):
            try:
                tenant = await tenants_col.find_one({"_id": ObjectId(unit["current_tenant_id"])})
                if tenant:
                    unit["tenant_name"] = tenant.get("name", "")
            except Exception:
                pass
        units.append(unit)
    return units


@router.get("/{unit_id}")
async def get_unit(unit_id: str, current_user=Depends(get_current_user)):
    unit = await units_col.find_one({"_id": ObjectId(unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    unit = serialize(unit)
    if unit.get("current_tenant_id"):
        try:
            tenant = await tenants_col.find_one({"_id": ObjectId(unit["current_tenant_id"])})
            if tenant:
                unit["tenant_name"] = tenant.get("name", "")
                unit["tenant_phone"] = tenant.get("phone", "")
        except Exception:
            pass
    return unit


@router.post("/")
async def create_unit(data: UnitCreate, current_user=Depends(get_current_user)):
    doc = data.dict()
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    result = await units_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{unit_id}")
async def update_unit(unit_id: str, data: UnitUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data["updated_at"] = datetime.utcnow()
    await units_col.update_one({"_id": ObjectId(unit_id)}, {"$set": update_data})
    unit = await units_col.find_one({"_id": ObjectId(unit_id)})
    return serialize(unit)


@router.delete("/{unit_id}")
async def delete_unit(unit_id: str, current_user=Depends(get_current_user)):
    result = await units_col.delete_one({"_id": ObjectId(unit_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Unit deleted"}
