import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "property_mgmt")
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-to-a-strong-secret-key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@property.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
