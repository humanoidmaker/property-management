from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import settings_col
from app.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    late_fee_per_day: Optional[int] = None
    payment_due_day: Optional[int] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None


@router.get("/")
async def get_settings(current_user=Depends(get_current_user)):
    settings = await settings_col.find_one({"key": "app_settings"})
    if settings:
        settings["_id"] = str(settings["_id"])
    return settings or {}


@router.put("/")
async def update_settings(data: SettingsUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if update_data:
        await settings_col.update_one(
            {"key": "app_settings"},
            {"$set": update_data},
            upsert=True,
        )
    settings = await settings_col.find_one({"key": "app_settings"})
    if settings:
        settings["_id"] = str(settings["_id"])
    return settings
