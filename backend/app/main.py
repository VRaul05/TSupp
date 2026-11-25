from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.kb import router as kb_router
from app.api.admin_users import router as admin_users_router
from app.api.admin_audit import router as admin_audit_router
from app.api.auth import router as auth_router
from app.core.config import settings
from app.core.database import engine
from app.api.ai import router as ai_router
app = FastAPI(title="TSupp API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_users_router)
app.include_router(admin_audit_router)
app.include_router(kb_router)
app.include_router(ai_router)
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tsupp-api"}


@app.get("/health/database")
def database_health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
