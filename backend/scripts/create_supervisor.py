"""Create the initial supervisor, without storing secrets in terminal history."""
import getpass

from sqlalchemy import select
from email_validator import validate_email, EmailNotValidError

from app.core.database import SessionLocal
from app.core.security import assert_institutional_email, hash_password
from app.models.user import User


def main() -> None:
    name = input("Supervisor name: ").strip()
    raw_email = input("Institutional email: ")
    try:
        email = assert_institutional_email(validate_email(raw_email, check_deliverability=False).normalized)
    except (EmailNotValidError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc
    password = getpass.getpass("Password (12-128 chars): ")
    confirmation = getpass.getpass("Confirm password: ")
    if not name or password != confirmation:
        raise SystemExit("Invalid name or passwords do not match")
    secret = hash_password(password)
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)):
            raise SystemExit("User already exists")
        # Bootstrap is allowed only when no active supervisor exists.
        if db.scalar(select(User.id).where(User.role == "supervisor", User.is_active.is_(True))):
            raise SystemExit("Initial supervisor already exists; use the admin API")
        db.add(User(name=name, email=email, password_hash=secret, role="supervisor"))
        db.commit()
    print("Initial supervisor created")


if __name__ == "__main__":
    main()
