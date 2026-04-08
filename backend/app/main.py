from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, properties_col, units_col, tenants_col, leases_col, payments_col, maintenance_col
from app.auth import get_current_user
from app.api.auth_api import router as auth_router
from app.api.settings_api import router as settings_router
from app.api.properties import router as properties_router
from app.api.units import router as units_router
from app.api.tenants import router as tenants_router
from app.api.leases import router as leases_router
from app.api.payments import router as payments_router
from app.api.maintenance import router as maintenance_router
from datetime import datetime, timedelta

app = FastAPI(title="RentFlow - Property Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(properties_router)
app.include_router(units_router)
app.include_router(tenants_router)
app.include_router(leases_router)
app.include_router(payments_router)
app.include_router(maintenance_router)


@app.get("/api/stats")
async def dashboard_stats(current_user=Depends(get_current_user)):
    total_properties = await properties_col.count_documents({})
    total_units = await units_col.count_documents({})
    occupied_units = await units_col.count_documents({"status": "occupied"})
    vacant_units = await units_col.count_documents({"status": "vacant"})
    maintenance_units = await units_col.count_documents({"status": "maintenance"})
    total_tenants = await tenants_col.count_documents({})
    active_leases = await leases_col.count_documents({"status": "active"})

    current_month = datetime.utcnow().strftime("%Y-%m")
    pipeline = [
        {"$match": {"month_year": current_month}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    result = await payments_col.aggregate(pipeline).to_list(1)
    monthly_revenue = result[0]["total"] if result else 0

    # Overdue payments count
    overdue_count = 0
    cursor = leases_col.find({"status": "active"})
    async for lease in cursor:
        lease_id = str(lease["_id"])
        existing = await payments_col.find_one({"lease_id": lease_id, "month_year": current_month})
        if not existing:
            overdue_count += 1

    # Expiring soon
    threshold = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    expiring = await leases_col.count_documents({
        "status": "active",
        "end_date": {"$gte": today, "$lte": threshold},
    })

    open_maintenance = await maintenance_col.count_documents({"status": {"$in": ["open", "in_progress"]}})
    urgent_maintenance = await maintenance_col.count_documents({"priority": "urgent", "status": {"$ne": "resolved"}})

    # Occupancy by property
    occupancy_by_property = []
    prop_cursor = properties_col.find({})
    async for prop in prop_cursor:
        pid = str(prop["_id"])
        total = await units_col.count_documents({"property_id": pid})
        occ = await units_col.count_documents({"property_id": pid, "status": "occupied"})
        occupancy_by_property.append({
            "name": prop.get("name", ""),
            "total": total,
            "occupied": occ,
            "pct": round((occ / total * 100) if total > 0 else 0, 1),
        })

    # Recent payments
    recent_payments = []
    pay_cursor = payments_col.find().sort("created_at", -1).limit(5)
    async for pay in pay_cursor:
        pay["_id"] = str(pay["_id"])
        if pay.get("lease_id"):
            try:
                from bson import ObjectId
                lease = await leases_col.find_one({"_id": ObjectId(pay["lease_id"])})
                if lease and lease.get("tenant_id"):
                    from app.database import tenants_col as tc
                    tenant = await tc.find_one({"_id": ObjectId(lease["tenant_id"])})
                    if tenant:
                        pay["tenant_name"] = tenant.get("name", "")
                if lease:
                    pay["unit_number"] = lease.get("unit_number", "")
            except Exception:
                pass
        recent_payments.append(pay)

    # Revenue trend (last 6 months)
    revenue_trend = []
    for i in range(5, -1, -1):
        d = datetime.utcnow() - timedelta(days=i * 30)
        m = d.strftime("%Y-%m")
        pipe = [
            {"$match": {"month_year": m}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]
        r = await payments_col.aggregate(pipe).to_list(1)
        revenue_trend.append({"month": m, "amount": r[0]["total"] if r else 0})

    return {
        "total_properties": total_properties,
        "total_units": total_units,
        "occupied_units": occupied_units,
        "vacant_units": vacant_units,
        "maintenance_units": maintenance_units,
        "total_tenants": total_tenants,
        "active_leases": active_leases,
        "monthly_revenue": monthly_revenue,
        "overdue_count": overdue_count,
        "expiring_leases": expiring,
        "open_maintenance": open_maintenance,
        "urgent_maintenance": urgent_maintenance,
        "occupancy_by_property": occupancy_by_property,
        "recent_payments": recent_payments,
        "revenue_trend": revenue_trend,
    }


@app.get("/")
async def root():
    return {"app": "RentFlow", "version": "1.0.0", "status": "running"}
