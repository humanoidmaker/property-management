from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from app.database import properties_col, units_col
from app.auth import get_current_user

router = APIRouter(prefix="/api/properties", tags=["properties"])


class PropertyCreate(BaseModel):
    name: str
    address: str
    type: str  # apartment/house/commercial/villa
    total_units: int
    description: Optional[str] = ""
    amenities: Optional[List[str]] = []
    is_active: Optional[bool] = True


class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    type: Optional[str] = None
    total_units: Optional[int] = None
    description: Optional[str] = None
    amenities: Optional[List[str]] = None
    is_active: Optional[bool] = None


def serialize(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/")
async def list_properties(
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"address": {"$regex": search, "$options": "i"}},
        ]
    if type:
        query["type"] = type

    cursor = properties_col.find(query).sort("created_at", -1)
    properties = []
    async for prop in cursor:
        prop = serialize(prop)
        # Count units
        total = await units_col.count_documents({"property_id": prop["_id"]})
        occupied = await units_col.count_documents({"property_id": prop["_id"], "status": "occupied"})
        prop["units_count"] = total
        prop["occupied_count"] = occupied
        prop["occupancy_pct"] = round((occupied / total * 100) if total > 0 else 0, 1)
        properties.append(prop)
    return properties


@router.get("/{property_id}")
async def get_property(property_id: str, current_user=Depends(get_current_user)):
    prop = await properties_col.find_one({"_id": ObjectId(property_id)})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    prop = serialize(prop)
    total = await units_col.count_documents({"property_id": prop["_id"]})
    occupied = await units_col.count_documents({"property_id": prop["_id"], "status": "occupied"})
    prop["units_count"] = total
    prop["occupied_count"] = occupied
    prop["occupancy_pct"] = round((occupied / total * 100) if total > 0 else 0, 1)
    return prop


@router.post("/")
async def create_property(data: PropertyCreate, current_user=Depends(get_current_user)):
    doc = data.dict()
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    result = await properties_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{property_id}")
async def update_property(property_id: str, data: PropertyUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data["updated_at"] = datetime.utcnow()
    await properties_col.update_one({"_id": ObjectId(property_id)}, {"$set": update_data})
    prop = await properties_col.find_one({"_id": ObjectId(property_id)})
    return serialize(prop)


@router.delete("/{property_id}")
async def delete_property(property_id: str, current_user=Depends(get_current_user)):
    result = await properties_col.delete_one({"_id": ObjectId(property_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    # Also delete associated units
    await units_col.delete_many({"property_id": property_id})
    return {"message": "Property deleted"}
