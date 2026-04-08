from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime
from app.database import payments_col, leases_col, tenants_col, properties_col, settings_col
from app.auth import get_current_user
import random
import string

router = APIRouter(prefix="/api/payments", tags=["payments"])


class PaymentCreate(BaseModel):
    lease_id: str
    amount: float
    month_year: str  # YYYY-MM
    payment_method: Optional[str] = "cash"  # cash/upi/bank_transfer/cheque
    transaction_ref: Optional[str] = ""


def serialize(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


def generate_receipt_number():
    prefix = "RCT"
    ts = datetime.utcnow().strftime("%Y%m%d")
    rand = "".join(random.choices(string.digits, k=4))
    return f"{prefix}-{ts}-{rand}"


@router.get("/")
async def list_payments(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    lease_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    query = {}
    if lease_id:
        query["lease_id"] = lease_id
    if from_date or to_date:
        date_q = {}
        if from_date:
            date_q["$gte"] = from_date
        if to_date:
            date_q["$lte"] = to_date
        query["month_year"] = date_q

    cursor = payments_col.find(query).sort("created_at", -1)
    payments = []
    async for payment in cursor:
        payment = serialize(payment)
        # Enrich
        if payment.get("lease_id"):
            try:
                lease = await leases_col.find_one({"_id": ObjectId(payment["lease_id"])})
                if lease:
                    payment["unit_number"] = lease.get("unit_number", "")
                    payment["property_id"] = lease.get("property_id", "")
                    if lease.get("tenant_id"):
                        tenant = await tenants_col.find_one({"_id": ObjectId(lease["tenant_id"])})
                        if tenant:
                            payment["tenant_name"] = tenant.get("name", "")
                    if lease.get("property_id"):
                        prop = await properties_col.find_one({"_id": ObjectId(lease["property_id"])})
                        if prop:
                            payment["property_name"] = prop.get("name", "")
            except Exception:
                pass
        payments.append(payment)
    return payments


@router.get("/pending")
async def pending_payments(current_user=Depends(get_current_user)):
    """Get all active leases with unpaid months."""
    current_month = datetime.utcnow().strftime("%Y-%m")
    pending = []

    cursor = leases_col.find({"status": "active"})
    async for lease in cursor:
        lease_id = str(lease["_id"])
        # Check if current month is paid
        existing = await payments_col.find_one({
            "lease_id": lease_id,
            "month_year": current_month,
        })
        if not existing:
            item = {
                "lease_id": lease_id,
                "unit_number": lease.get("unit_number", ""),
                "property_id": lease.get("property_id", ""),
                "rent_amount": lease.get("rent_amount", 0),
                "month_year": current_month,
            }
            if lease.get("tenant_id"):
                try:
                    tenant = await tenants_col.find_one({"_id": ObjectId(lease["tenant_id"])})
                    if tenant:
                        item["tenant_name"] = tenant.get("name", "")
                except Exception:
                    pass
            if lease.get("property_id"):
                try:
                    prop = await properties_col.find_one({"_id": ObjectId(lease["property_id"])})
                    if prop:
                        item["property_name"] = prop.get("name", "")
                except Exception:
                    pass
            pending.append(item)
    return pending


@router.get("/stats")
async def payment_stats(current_user=Depends(get_current_user)):
    current_month = datetime.utcnow().strftime("%Y-%m")

    # Total collected this month
    pipeline_collected = [
        {"$match": {"month_year": current_month}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    collected_result = await payments_col.aggregate(pipeline_collected).to_list(1)
    total_collected = collected_result[0]["total"] if collected_result else 0

    # Total expected (all active leases)
    pipeline_expected = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": None, "total": {"$sum": "$rent_amount"}}},
    ]
    expected_result = await leases_col.aggregate(pipeline_expected).to_list(1)
    total_expected = expected_result[0]["total"] if expected_result else 0

    pending_amount = total_expected - total_collected
    overdue = max(0, pending_amount)

    # Total all time
    pipeline_all = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    all_result = await payments_col.aggregate(pipeline_all).to_list(1)
    total_all_time = all_result[0]["total"] if all_result else 0

    return {
        "total_collected": total_collected,
        "total_expected": total_expected,
        "pending_amount": pending_amount,
        "overdue": overdue,
        "total_all_time": total_all_time,
        "current_month": current_month,
    }


@router.get("/receipt/{payment_id}")
async def get_receipt(payment_id: str, current_user=Depends(get_current_user)):
    payment = await payments_col.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    settings = await settings_col.find_one({"key": "app_settings"})
    company_name = settings.get("company_name", "RentFlow") if settings else "RentFlow"
    currency_symbol = settings.get("currency_symbol", "\u20b9") if settings else "\u20b9"

    tenant_name = ""
    property_name = ""
    unit_number = ""
    if payment.get("lease_id"):
        try:
            lease = await leases_col.find_one({"_id": ObjectId(payment["lease_id"])})
            if lease:
                unit_number = lease.get("unit_number", "")
                if lease.get("tenant_id"):
                    tenant = await tenants_col.find_one({"_id": ObjectId(lease["tenant_id"])})
                    if tenant:
                        tenant_name = tenant.get("name", "")
                if lease.get("property_id"):
                    prop = await properties_col.find_one({"_id": ObjectId(lease["property_id"])})
                    if prop:
                        property_name = prop.get("name", "")
        except Exception:
            pass

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payment Receipt</title>
<style>
body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }}
.header {{ text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 20px; }}
.header h1 {{ color: #1e3a5f; margin: 0; }}
.receipt-no {{ color: #666; font-size: 14px; }}
table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
td {{ padding: 8px; border-bottom: 1px solid #eee; }}
td:first-child {{ font-weight: bold; color: #555; width: 40%; }}
.amount {{ font-size: 24px; color: #1e3a5f; font-weight: bold; text-align: center; margin: 20px 0; }}
.footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 40px; }}
@media print {{ body {{ margin: 0; }} }}
</style></head><body>
<div class="header">
<h1>{company_name}</h1>
<p class="receipt-no">Receipt: {payment.get("receipt_number", "N/A")}</p>
</div>
<div class="amount">{currency_symbol}{payment.get("amount", 0):,.2f}</div>
<table>
<tr><td>Tenant</td><td>{tenant_name}</td></tr>
<tr><td>Property</td><td>{property_name}</td></tr>
<tr><td>Unit</td><td>{unit_number}</td></tr>
<tr><td>Month</td><td>{payment.get("month_year", "")}</td></tr>
<tr><td>Payment Method</td><td>{payment.get("payment_method", "").upper()}</td></tr>
<tr><td>Transaction Ref</td><td>{payment.get("transaction_ref", "N/A")}</td></tr>
<tr><td>Date</td><td>{payment.get("created_at", "")}</td></tr>
</table>
<div class="footer">
<p>This is a computer-generated receipt and does not require a signature.</p>
<p>Thank you for your payment!</p>
</div>
</body></html>"""
    return {"html": html, "payment": serialize(payment)}


@router.post("/")
async def create_payment(data: PaymentCreate, current_user=Depends(get_current_user)):
    # Validate lease
    lease = await leases_col.find_one({"_id": ObjectId(data.lease_id)})
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    doc = data.dict()
    doc["receipt_number"] = generate_receipt_number()
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    result = await payments_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc
