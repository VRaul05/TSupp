from datetime import timedelta
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import SESSION_IDLE_MINUTES, as_utc, decode_access_token, now_utc
from app.models.auth import AuthSession
from app.models.user import User


def get_db():
    with SessionLocal() as db:
        yield db


Db = Annotated[Session, Depends(get_db)]
bearer = HTTPBearer(auto_error=False)


def authentication_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_session_and_user(
    db: Db,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> tuple[AuthSession, User]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise authentication_error()
    try:
        claims = decode_access_token(credentials.credentials)
        user_id, session_id = UUID(claims["sub"]), UUID(claims["sid"])
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        raise authentication_error() from None

    session = db.scalar(select(AuthSession).where(AuthSession.id == session_id, AuthSession.user_id == user_id))
    user = db.get(User, user_id)
    now = now_utc()
    if (
        session is None or user is None or not user.is_active or session.revoked_at is not None
        or now >= as_utc(session.expires_at) or now - as_utc(session.last_seen_at) > timedelta(minutes=SESSION_IDLE_MINUTES)
    ):
        raise authentication_error()
    session.last_seen_at = now
    db.commit()
    return session, user


CurrentSession = Annotated[tuple[AuthSession, User], Depends(get_session_and_user)]


def get_current_user(identity: CurrentSession) -> User:
    return identity[1]


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: str):
    def _guard(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _guard
