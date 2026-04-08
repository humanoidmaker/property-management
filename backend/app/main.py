from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.api import auth, settings as settings_api

# Import app-specific routers
try:
    from app.api import properties, units, tenants, leases, payments, maintenance
    HAS_APP_ROUTES = True
except ImportError:
    HAS_APP_ROUTES = False
    
# Try alternate imports for agent-written routes
try:
    from app.api import auth_api, settings_api as settings_api2, properties as props2
except ImportError:
    pass

@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield

app = FastAPI(title="RentFlow Property API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(settings_api.router)

if HAS_APP_ROUTES:
    app.include_router(properties.router)
    app.include_router(units.router)
    app.include_router(tenants.router)
    app.include_router(leases.router)
    app.include_router(payments.router)
    app.include_router(maintenance.router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "RentFlow Property"}

@app.get("/api/stats")
async def stats():
    from app.core.database import get_db as gdb
    db = await gdb()
    if db is None:
        return {"stats": {}}
    counts = {}
    for coll in await db.list_collection_names():
        if coll != "system.indexes":
            counts[f"total_{coll}"] = await db[coll].count_documents({})
    return {"stats": counts}
