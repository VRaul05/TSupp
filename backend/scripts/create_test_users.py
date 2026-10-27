
from getpass import getpass
from pathlib import Path
import sys

from sqlalchemy import select

# Permite ejecutar el script desde backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def create_user(db, name, email, role):
    existing = db.scalar(
        select(User).where(User.email == email)
    )

    if existing:
        print(f"El usuario {email} ya existe.")
        return

    password = getpass(
        f"Contraseña para {email}: "
    )

    if len(password) < 12:
        print("La contraseña debe tener al menos 12 caracteres.")
        return

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )

    db.add(user)
    db.commit()

    print(f"Usuario {role} creado correctamente.")


def main():
    with SessionLocal() as db:
        create_user(
            db,
            "Agente de prueba",
            "agente.prueba@tsupp.local",
            "agent",
        )

        create_user(
            db,
            "Supervisor de prueba",
            "supervisor.prueba@tsupp.local",
            "supervisor",
        )


if __name__ == "__main__":
    main()
