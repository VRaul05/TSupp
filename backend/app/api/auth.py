from datetime import timedelta
import smtplib

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update

from app.api.deps import CurrentSession, CurrentUser, Db
from app.core.security import (
    DUMMY_HASH, RESET_TOKEN_MINUTES, SESSION_ABSOLUTE_HOURS,
    as_utc, assert_institutional_email, create_access_token, hash_password,
    hash_reset_token, now_utc, random_reset_token, verify_password,
)
from app.models.auth import AuditEvent, AuthSession, PasswordResetToken
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, LoginResponse, MessageResponse, ResetConfirm, ResetRequest, UserResponse,
)
from app.services.mailer import send_password_reset_email, smtp_is_configured

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def audit(db: Db, *, actor: User | None, action: str, target: str) -> None:
    db.add(AuditEvent(actor_id=actor.id if actor else None, action=action, target=target))


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Db):
    try:
        email = assert_institutional_email(str(payload.email))
    except ValueError:
        audit(db, actor=None, action="auth.login_failed", target=str(payload.email).lower())
        db.commit()
        raise HTTPException(401, "Invalid credentials") from None
    user = db.scalar(select(User).where(User.email == email).with_for_update())
    now = now_utc()

    # Equalize the most obvious absent-user timing difference.
    if user is None:
        verify_password(payload.password, DUMMY_HASH)
        audit(db, actor=None, action="auth.login_failed", target=email)
        db.commit()
        raise HTTPException(401, "Invalid credentials")

    if user.locked_until is not None and as_utc(user.locked_until) > now:
        audit(db, actor=user, action="auth.login_locked", target=str(user.id))
        db.commit()
        raise HTTPException(401, "Invalid credentials")

    if not user.is_active or not verify_password(payload.password, user.password_hash):
        if user.first_failed_at is None or now - as_utc(user.first_failed_at) > timedelta(minutes=15):
            user.failed_login_count = 0
            user.first_failed_at = now
        user.failed_login_count += 1
        if user.failed_login_count >= 5:
            user.locked_until = now + timedelta(minutes=15)
            user.failed_login_count = 0
            user.first_failed_at = None
        audit(db, actor=user, action="auth.login_failed", target=str(user.id))
        db.commit()
        raise HTTPException(401, "Invalid credentials")

    user.failed_login_count = 0
    user.first_failed_at = None
    user.locked_until = None
    expires_at = now + timedelta(hours=SESSION_ABSOLUTE_HOURS)
    session = AuthSession(user_id=user.id, issued_at=now, last_seen_at=now, expires_at=expires_at)
    db.add(session)
    db.flush()
    token = create_access_token(user_id=user.id, session_id=session.id, expires_at=expires_at)
    audit(db, actor=user, action="auth.login_success", target=str(user.id))
    db.commit()
    return LoginResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser):
    return user


@router.post("/logout", response_model=MessageResponse)
def logout(identity: CurrentSession, db: Db):
    session, user = identity
    session.revoked_at = now_utc()
    audit(db, actor=user, action="auth.logout", target=str(session.id))
    db.commit()
    return MessageResponse(message="Session closed")


@router.post("/password-reset/request", response_model=MessageResponse)
def request_reset(payload: ResetRequest, db: Db):
    # All addresses receive the same answer; a missing SMTP service is a deployment error.
    if not smtp_is_configured():
        raise HTTPException(503, "Institutional mail service is not configured")

    try:
        email = assert_institutional_email(str(payload.email))
    except ValueError:
        return MessageResponse(message="If the account exists, instructions will be sent")

    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if user:
        # Prevent repeated mail deliveries to a single account in a short window.
        recent = db.scalar(select(PasswordResetToken.id).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.created_at > now_utc() - timedelta(minutes=2),
        ).limit(1))
        if recent is not None:
            return MessageResponse(message="If the account exists, instructions will be sent")
        token = random_reset_token()
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(token),
            expires_at=now_utc() + timedelta(minutes=RESET_TOKEN_MINUTES),
        ))
        audit(db, actor=user, action="auth.password_reset_requested", target=str(user.id))
        db.commit()
        try:
            send_password_reset_email(recipient=user.email, token=token)
        except (OSError, smtplib.SMTPException):
            # Never expose account existence or raw tokens in an HTTP response/log.
            audit(db, actor=user, action="auth.password_reset_delivery_failed", target=str(user.id))
            db.commit()
    return MessageResponse(message="If the account exists, instructions will be sent")


@router.post("/password-reset/confirm", response_model=MessageResponse)
def confirm_reset(payload: ResetConfirm, db: Db):
    now = now_utc()
    record = db.scalar(select(PasswordResetToken).where(
        PasswordResetToken.token_hash == hash_reset_token(payload.token)
    ).with_for_update())
    if record is None or record.used_at is not None or as_utc(record.expires_at) <= now:
        raise HTTPException(400, "Invalid or expired reset token")
    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(400, "Invalid or expired reset token")
    try:
        new_hash = hash_password(payload.new_password)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    user.password_hash = new_hash
    user.failed_login_count = 0
    user.first_failed_at = None
    user.locked_until = None
    record.used_at = now
    db.execute(update(AuthSession).where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
               .values(revoked_at=now))
    audit(db, actor=user, action="auth.password_reset_completed", target=str(user.id))
    db.commit()
    return MessageResponse(message="Password updated")
