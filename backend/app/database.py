from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URI, DB_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# Collections
properties_col = db["properties"]
units_col = db["units"]
tenants_col = db["tenants"]
leases_col = db["leases"]
payments_col = db["payments"]
maintenance_col = db["maintenance"]
users_col = db["users"]
settings_col = db["settings"]


async def init_db():
    """Create indexes and seed initial data."""
    # Indexes
    await properties_col.create_index("name")
    await tenants_col.create_index("phone", unique=True)
    await leases_col.create_index([("property_id", 1), ("unit_number", 1), ("status", 1)])
    await payments_col.create_index([("lease_id", 1), ("month_year", 1)])
    await units_col.create_index([("property_id", 1), ("unit_number", 1)], unique=True)

    # Seed admin user
    existing = await users_col.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await users_col.insert_one({
            "email": ADMIN_EMAIL,
            "password": pwd_context.hash(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
        })

    # Seed default settings
    existing_settings = await settings_col.find_one({"key": "app_settings"})
    if not existing_settings:
        await settings_col.insert_one({
            "key": "app_settings",
            "company_name": "RentFlow Property Management",
            "late_fee_per_day": 50,
            "payment_due_day": 5,
            "currency": "INR",
            "currency_symbol": "\u20b9",
        })
