"""Seed sample data for RentFlow Property Management System."""
import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import random

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "property_mgmt"

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]


async def seed():
    # Clear existing data
    for col_name in ["properties", "units", "tenants", "leases", "payments", "maintenance", "users", "settings"]:
        await db[col_name].drop()

    # Seed admin
    await db["users"].insert_one({
        "email": "admin@property.local",
        "password": pwd_context.hash("admin123"),
        "name": "Admin",
        "role": "admin",
    })

    # Seed settings
    await db["settings"].insert_one({
        "key": "app_settings",
        "company_name": "RentFlow Property Management",
        "late_fee_per_day": 50,
        "payment_due_day": 5,
        "currency": "INR",
        "currency_symbol": "\u20b9",
    })

    # ---- Properties ----
    properties_data = [
        {"name": "Sunrise Apartments", "address": "42 MG Road, Bangalore 560001", "type": "apartment", "total_units": 12, "description": "Modern apartment complex with amenities", "amenities": ["parking", "gym", "swimming pool", "security"], "is_active": True},
        {"name": "Green Valley Villas", "address": "15 Lake View Road, Mysore 570001", "type": "villa", "total_units": 6, "description": "Premium gated villa community", "amenities": ["garden", "clubhouse", "security", "playground"], "is_active": True},
        {"name": "Metro Business Park", "address": "88 Industrial Area, Bangalore 560058", "type": "commercial", "total_units": 8, "description": "Prime commercial office space", "amenities": ["parking", "lift", "power backup", "cafeteria"], "is_active": True},
    ]
    for p in properties_data:
        p["created_at"] = datetime.utcnow()
        p["updated_at"] = datetime.utcnow()
    prop_result = await db["properties"].insert_many(properties_data)
    prop_ids = [str(pid) for pid in prop_result.inserted_ids]

    # ---- Units ----
    units_data = []
    # Sunrise Apartments: 12 units (4 floors, 3 per floor)
    for floor in range(1, 5):
        for u in range(1, 4):
            num = f"{floor}0{u}"
            units_data.append({
                "property_id": prop_ids[0], "unit_number": num, "floor": floor,
                "bedrooms": random.choice([1, 2, 3]), "bathrooms": random.choice([1, 2]),
                "area_sqft": random.choice([650, 850, 1100, 1350]),
                "rent_amount": random.choice([12000, 15000, 18000, 22000]),
                "deposit_amount": random.choice([50000, 75000, 100000]),
                "status": "vacant", "current_tenant_id": None,
                "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
            })
    # Green Valley Villas: 6 units
    for u in range(1, 7):
        units_data.append({
            "property_id": prop_ids[1], "unit_number": f"V-{u}", "floor": 0,
            "bedrooms": random.choice([3, 4]), "bathrooms": random.choice([2, 3]),
            "area_sqft": random.choice([2000, 2500, 3000]),
            "rent_amount": random.choice([35000, 40000, 45000, 50000]),
            "deposit_amount": random.choice([150000, 200000]),
            "status": "vacant", "current_tenant_id": None,
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        })
    # Metro Business Park: 8 units
    for u in range(1, 9):
        units_data.append({
            "property_id": prop_ids[2], "unit_number": f"OFF-{u}", "floor": random.choice([1, 2, 3]),
            "bedrooms": 0, "bathrooms": 1,
            "area_sqft": random.choice([500, 800, 1000, 1500]),
            "rent_amount": random.choice([25000, 30000, 35000, 40000]),
            "deposit_amount": random.choice([100000, 150000]),
            "status": "vacant", "current_tenant_id": None,
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        })
    unit_result = await db["units"].insert_many(units_data)
    unit_ids = [str(uid) for uid in unit_result.inserted_ids]

    # ---- Tenants ----
    tenant_names = [
        "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", "Vikram Singh",
        "Anita Desai", "Suresh Nair", "Meena Iyer", "Karthik Rajan", "Deepa Menon",
        "Rahul Gupta", "Pooja Mehta", "Arun Joshi", "Divya Pillai", "Nikhil Verma",
    ]
    tenants_data = []
    for i, name in enumerate(tenant_names):
        tenants_data.append({
            "name": name,
            "phone": f"98765{43210 + i}",
            "email": f"{name.lower().replace(' ', '.')}@email.com",
            "id_proof_type": random.choice(["Aadhaar", "PAN", "Passport"]),
            "id_proof_number": f"XXXX{random.randint(1000, 9999)}",
            "emergency_contact": f"98765{10000 + i}",
            "occupation": random.choice(["Software Engineer", "Doctor", "Teacher", "Business Owner", "Accountant", "Designer"]),
            "move_in_date": (datetime.utcnow() - timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
    tenant_result = await db["tenants"].insert_many(tenants_data)
    tenant_ids = [str(tid) for tid in tenant_result.inserted_ids]

    # ---- Leases (15 active) ----
    # Assign tenants to specific units
    lease_assignments = [
        (0, 0), (0, 1), (0, 2), (0, 3), (0, 4),  # Sunrise units 0-4
        (0, 5), (0, 6), (0, 7),  # Sunrise units 5-7
        (1, 12), (1, 13), (1, 14),  # Green Valley V-1, V-2, V-3
        (2, 18), (2, 19), (2, 20), (2, 21),  # Metro OFF-1 to OFF-4
    ]

    leases_data = []
    for idx, (prop_idx, unit_idx) in enumerate(lease_assignments[:15]):
        tenant_idx = idx
        unit = units_data[unit_idx]
        start = datetime.utcnow() - timedelta(days=random.randint(60, 300))
        end = start + timedelta(days=365)
        leases_data.append({
            "property_id": prop_ids[prop_idx],
            "unit_number": unit["unit_number"],
            "tenant_id": tenant_ids[tenant_idx],
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date": end.strftime("%Y-%m-%d"),
            "rent_amount": unit["rent_amount"],
            "deposit_amount": unit["deposit_amount"],
            "terms": "Standard 11-month lease agreement",
            "status": "active",
            "created_at": start,
            "updated_at": start,
        })
        # Mark unit occupied
        await db["units"].update_one(
            {"property_id": unit["property_id"], "unit_number": unit["unit_number"]},
            {"$set": {"status": "occupied", "current_tenant_id": tenant_ids[tenant_idx]}},
        )

    lease_result = await db["leases"].insert_many(leases_data)
    lease_ids = [str(lid) for lid in lease_result.inserted_ids]

    # ---- Payments (30 over 3 months) ----
    payments_data = []
    months = []
    for i in range(3):
        d = datetime.utcnow() - timedelta(days=i * 30)
        months.append(d.strftime("%Y-%m"))

    receipt_counter = 1000
    for month in months:
        for i in range(10):
            lease_idx = i % len(lease_ids)
            receipt_counter += 1
            payments_data.append({
                "lease_id": lease_ids[lease_idx],
                "amount": leases_data[lease_idx]["rent_amount"],
                "month_year": month,
                "payment_method": random.choice(["cash", "upi", "bank_transfer", "cheque"]),
                "transaction_ref": f"TXN-{receipt_counter}",
                "receipt_number": f"RCT-{month.replace('-', '')}-{receipt_counter}",
                "created_at": datetime.utcnow() - timedelta(days=random.randint(0, 90)),
                "updated_at": datetime.utcnow(),
            })
    await db["payments"].insert_many(payments_data)

    # ---- Maintenance Requests (10) ----
    maintenance_data = []
    titles = [
        "Leaking faucet in kitchen", "AC not cooling", "Broken window lock",
        "Electrical short circuit", "Wall paint peeling", "Toilet flush not working",
        "Door hinge broken", "Water heater malfunction", "Ceiling fan noise",
        "Pest control needed",
    ]
    categories = ["plumbing", "electrical", "carpentry", "painting", "plumbing", "plumbing", "carpentry", "electrical", "electrical", "other"]
    statuses = ["open", "open", "in_progress", "in_progress", "resolved", "open", "resolved", "in_progress", "open", "resolved"]
    priorities = ["high", "urgent", "medium", "high", "low", "medium", "low", "urgent", "medium", "low"]

    for i in range(10):
        lease_idx = i % len(lease_ids)
        maintenance_data.append({
            "property_id": leases_data[lease_idx]["property_id"],
            "unit_number": leases_data[lease_idx]["unit_number"],
            "tenant_id": leases_data[lease_idx]["tenant_id"],
            "title": titles[i],
            "description": f"Detailed description for: {titles[i]}",
            "priority": priorities[i],
            "category": categories[i],
            "status": statuses[i],
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            "updated_at": datetime.utcnow(),
        })
    await db["maintenance"].insert_many(maintenance_data)

    # Create indexes
    await db["properties"].create_index("name")
    await db["tenants"].create_index("phone", unique=True)
    await db["leases"].create_index([("property_id", 1), ("unit_number", 1), ("status", 1)])
    await db["payments"].create_index([("lease_id", 1), ("month_year", 1)])
    await db["units"].create_index([("property_id", 1), ("unit_number", 1)], unique=True)

    print("Sample data seeded successfully!")
    print(f"  Properties: {len(properties_data)}")
    print(f"  Units: {len(units_data)}")
    print(f"  Tenants: {len(tenants_data)}")
    print(f"  Leases: {len(leases_data)}")
    print(f"  Payments: {len(payments_data)}")
    print(f"  Maintenance: {len(maintenance_data)}")


if __name__ == "__main__":
    asyncio.run(seed())
