import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from argon2 import PasswordHasher, exceptions as argon_errors

from app.core.config import settings

hasher = PasswordHasher()
DUMMY_HASH = hasher.hash("not-a-real-account-placeholder")
ROLES = {"employee", "support_agent", "supervisor"}
SESSION_ABSOLUTE_HOURS = 8
SESSION_IDLE_MINUTES = 30
RESET_TOKEN_MINUTES = 15


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def assert_institutional_email(email: str) -> str:
    normalized = normalize_email(email)
    domain = settings.institutional_email_domain.lower().strip().lstrip("@")
    if normalized.rpartition("@")[2] != domain:
        raise ValueError("Email must use the authorized institutional domain")
    return normalized


def validate_password(password: str) -> None:
    if len(password) < 12 or len(password) > 128:
        raise ValueError("Password length must be between 12 and 128 characters")


def hash_password(password: str) -> str:
    validate_password(password)
    return hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return hasher.verify(password_hash, password)
    except (argon_errors.VerifyMismatchError, argon_errors.VerificationError, argon_errors.InvalidHashError):
        return False


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def random_reset_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_token(*, user_id: UUID, session_id: UUID, expires_at: datetime) -> str:
    now = now_utc()
    return jwt.encode(
        {"sub": str(user_id), "sid": str(session_id), "iss": settings.jwt_issuer,
         "iat": now, "exp": expires_at},
        settings.jwt_secret, algorithm="HS256",
    )


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer,
        options={"require": ["sub", "sid", "iat", "exp", "iss"]},
    )


def as_utc(value: datetime) -> datetime:
    """Normalize timestamp values returned by database adapters to UTC."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
