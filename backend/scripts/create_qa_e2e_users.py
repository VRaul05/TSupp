
import getpass
import os
from pathlib import Path

# Forzar la configuración QA antes de importar la aplicación.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
os.environ["ENV_FILE"] = str(PROJECT_ROOT / ".env.qa")

from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def request_password(label: str) -> str:
    while True:
        password = getpass.getpass(
            f"Contraseña para {label}: "
        )
        confirmation = getpass.getpass(
            "Confirma la contraseña: "
        )

        if password != confirmation:
            print("Las contraseñas no coinciden.")
            continue

        if len(password) < 12:
            print("Utiliza al menos 12 caracteres.")
            continue

        return password


def main():
    database_name = make_url(settings.database_url).database

    if database_name != "tsupp_qa":
        raise RuntimeError(
            "Operación cancelada: la conexión no apunta "
            "a la base de datos tsupp_qa."
        )

    print("Base de datos QA verificada.")
    print("Se crearán o actualizarán dos usuarios E2E.")

    qa_users = [
        {
            "name": "Agente E2E",
            "email": "e2e.agent@tsupp.local",
            "role": "agent",
        },
        {
            "name": "Supervisor E2E",
            "email": "e2e.supervisor@tsupp.local",
            "role": "supervisor",
        },
    ]

    session = SessionLocal()

    try:
        for data in qa_users:
            password = request_password(data["email"])

            user = session.scalar(
                select(User).where(
                    User.email == data["email"]
                )
            )

            if user is None:
                user = User(
                    name=data["name"],
                    email=data["email"],
                    password_hash=hash_password(password),
                    role=data["role"],
                    is_active=True,
                )
                session.add(user)
                action = "creado"
            else:
                user.name = data["name"]
                user.password_hash = hash_password(password)
                user.role = data["role"]
                user.is_active = True
                action = "actualizado"

            session.flush()
            print(
                f"Usuario {data['email']}: {action}."
            )

        session.commit()
        print("\nUsuarios E2E preparados correctamente.")

    except Exception:
        session.rollback()
        raise

    finally:
        session.close()


if __name__ == "__main__":
    main()
