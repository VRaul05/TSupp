from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.api.deps import Db, require_roles
from app.models.auth import AuditEvent
from app.models.user import User

router = APIRouter(prefix="/api/admin/audit", tags=["Audit"])
Supervisor = Annotated[User, Depends(require_roles("supervisor"))]


class AuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    actor_id: UUID | None
    action: str
    target: str
    timestamp: datetime


@router.get("", response_model=list[AuditResponse])
def list_audit_events(
    db: Db,
    supervisor: Supervisor,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return db.scalars(
        select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit).offset(offset)
    ).all()
