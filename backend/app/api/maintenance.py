from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime
from app.database import maintenance_col, tenants_col, properties_col
from app.auth import get_current_user

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


class MaintenanceCreate(BaseModel):
    property_id: str
    unit_number: str
    tenant_id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    priority: str = "medium"  # low/medium/high/urgent
    category: str = "other"  # plumbing/electrical/carpentry/painting/other


class StatusUpdate(BaseModel):
    status: str  # open/in_progress/resolved
    notes: Optional[str] = ""


def serialize(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/")
async def list_maintenance(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if property_id:
        query["property_id"] = property_id

    cursor = maintenance_col.find(query).sort("created_at", -1)
    items = []
    async for item in cursor:
        item = serialize(item)
        if item.get("tenant_id"):
            try:
                tenant = await tenants_col.find_one({"_id": ObjectId(item["tenant_id"])})
                if tenant:
                    item["tenant_name"] = tenant.get("name", "")
            except Exception:
                pass
        if item.get("property_id"):
            try:
                prop = await properties_col.find_one({"_id": ObjectId(item["property_id"])})
                if prop:
                    item["property_name"] = prop.get("name", "")
            except Exception:
                pass
        items.append(item)
    return items


@router.get("/stats")
async def maintenance_stats(current_user=Depends(get_current_user)):
    total = await maintenance_col.count_documents({})
    open_count = await maintenance_col.count_documents({"status": "open"})
    in_progress = await maintenance_col.count_documents({"status": "in_progress"})
    resolved = await maintenance_col.count_documents({"status": "resolved"})
    urgent = await maintenance_col.count_documents({"priority": "urgent", "status": {"$ne": "resolved"}})
    high = await maintenance_col.count_documents({"priority": "high", "status": {"$ne": "resolved"}})

    # By category
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
    ]
    by_category = {}
    async for doc in maintenance_col.aggregate(pipeline):
        by_category[doc["_id"]] = doc["count"]

    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "resolved": resolved,
        "urgent": urgent,
        "high_priority": high,
        "by_category": by_category,
    }


@router.get("/{request_id}")
async def get_maintenance(request_id: str, current_user=Depends(get_current_user)):
    item = await maintenance_col.find_one({"_id": ObjectId(request_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    return serialize(item)


@router.post("/")
async def create_maintenance(data: MaintenanceCreate, current_user=Depends(get_current_user)):
    doc = data.dict()
    doc["status"] = "open"
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    result = await maintenance_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/{request_id}/status")
async def update_status(request_id: str, data: StatusUpdate, current_user=Depends(get_current_user)):
    item = await maintenance_col.find_one({"_id": ObjectId(request_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")

    update = {
        "status": data.status,
        "updated_at": datetime.utcnow(),
    }
    if data.notes:
        update["resolution_notes"] = data.notes
    if data.status == "resolved":
        update["resolved_at"] = datetime.utcnow()

    await maintenance_col.update_one({"_id": ObjectId(request_id)}, {"$set": update})
    item = await maintenance_col.find_one({"_id": ObjectId(request_id)})
    return serialize(item)
