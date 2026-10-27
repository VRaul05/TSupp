
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise invalid_credentials

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "sub"]},
        )

        if payload.get("type") != "access":
            raise invalid_credentials

        user_id = UUID(payload["sub"])

    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError):
        raise invalid_credentials

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        raise invalid_credentials

    return user


def require_agent(
    user: User = Depends(get_current_user),
) -> User:
    if user.role not in ("agent", "supervisor"):
        raise HTTPException(
            status_code=403,
            detail="Se requiere el rol de agente o supervisor",
        )

    return user


def require_supervisor(
    user: User = Depends(get_current_user),
) -> User:
    if user.role != "supervisor":
        raise HTTPException(
            status_code=403,
            detail="Se requiere el rol de supervisor",
        )

    return user
