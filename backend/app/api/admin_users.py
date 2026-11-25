from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.auth import audit
from app.api.deps import Db, require_roles
from app.core.security import assert_institutional_email, hash_password
from app.models.user import User
from app.schemas.auth import CreateUserRequest, UpdateUserRequest, UserResponse

router = APIRouter(prefix="/api/admin/users", tags=["User administration"])
Supervisor = Annotated[User, Depends(require_roles("supervisor"))]


@router.post("", response_model=UserResponse, status_code=201)
def create_user(payload: CreateUserRequest, db: Db, supervisor: Supervisor):
    try:
        email = assert_institutional_email(str(payload.email))
        password_hash = hash_password(payload.password)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    user = User(name=payload.name.strip(), email=email, password_hash=password_hash,
                role=payload.role, is_active=True)
    db.add(user)
    try:
        db.flush()
        audit(db, actor=supervisor, action="admin.user_created", target=str(user.id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Account already exists") from None
    db.refresh(user)
    return user


@router.get("", response_model=list[UserResponse])
def list_users(db: Db, supervisor: Supervisor):
    return db.scalars(select(User).order_by(User.name)).all()


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, payload: UpdateUserRequest, db: Db, supervisor: Supervisor):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Account not found")
    if payload.name is None and payload.role is None and payload.is_active is None:
        raise HTTPException(422, "No changes provided")
    # A supervisor must not accidentally remove their own access.
    if user.id == supervisor.id and (payload.is_active is False or (payload.role and payload.role != "supervisor")):
        raise HTTPException(409, "You cannot remove your own supervisor access")
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    audit(db, actor=supervisor, action="admin.user_updated", target=str(user.id))
    db.commit()
    db.refresh(user)
    return user
