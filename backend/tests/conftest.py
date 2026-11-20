
import os
import secrets
import sys
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete


# Determinar las rutas del proyecto.
BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent

# Seleccionar QA ANTES de importar cualquier módulo de la aplicación.
os.environ["ENV_FILE"] = str(PROJECT_ROOT / ".env.qa")

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Cargar y validar la configuración de QA.
from app.core.config import settings

if "tsupp_qa" not in settings.database_url:
    raise RuntimeError(
        "Las pruebas se cancelaron: la conexión no apunta a tsupp_qa. "
        "Revisa la configuración de .env.qa."
    )

# Importar la aplicación y los modelos después de configurar QA.
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.user import User
from app.models.knowledge import KnowledgeArticle


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def qa_users():
    run_id = secrets.token_hex(5)

    definitions = {
        "agent": {
            "name": "QA Agent",
            "role": "agent",
            "is_active": True,
        },
        "supervisor": {
            "name": "QA Supervisor",
            "role": "supervisor",
            "is_active": True,
        },
        "employee": {
            "name": "QA Employee",
            "role": "employee",
            "is_active": True,
        },
        "inactive": {
            "name": "QA Inactive User",
            "role": "agent",
            "is_active": False,
        },
    }

    users = {}
    user_ids = []

    with SessionLocal() as db:
        try:
            for key, definition in definitions.items():
                password = f"QA-{secrets.token_urlsafe(18)}-A1!"
                email = f"qa.{key}.{run_id}@tsupp.local"

                user = User(
                    name=definition["name"],
                    email=email,
                    password_hash=hash_password(password),
                    role=definition["role"],
                    is_active=definition["is_active"],
                )

                db.add(user)
                db.flush()

                user_ids.append(user.id)

                users[key] = {
                    "id": str(user.id),
                    "name": user.name,
                    "email": email,
                    "password": password,
                    "role": user.role,
                    "is_active": user.is_active,
                }

            db.commit()
            yield users

        finally:
            if user_ids:
                db.execute(delete(User).where(User.id.in_(user_ids)))
                db.commit()


@pytest.fixture(scope="session")
def usuarios(qa_users):
    return {
        "agt_a": qa_users["agent"],
        "sup_a": qa_users["supervisor"],
        "emp_a": qa_users["employee"],
        "usuario_desactivado": qa_users["inactive"],
    }


@pytest.fixture(scope="session")
def tokens(client, usuarios):
    result = {}

    for key, user in usuarios.items():
        if not user["is_active"]:
            continue

        response = client.post(
            "/api/auth/login",
            json={
                "email": user["email"],
                "password": user["password"],
            },
        )

        assert response.status_code == 200, (
            f"No se pudo autenticar al usuario {key}: "
            f"{response.status_code} - {response.text}"
        )

        result[key] = response.json()["access_token"]

    return result


@pytest.fixture
def crear_articulo():
    """
    Crea artículos mediante la API y elimina los registros
    al terminar cada prueba.
    """
    articulos_creados = []

    def crear(client, token, title=None, content="Contenido inicial"):
        titulo = title or f"QA Article {uuid.uuid4().hex[:10]}"

        response = client.post(
            "/api/knowledge",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": titulo,
                "category": "QA",
                "content": content,
                "note": "Artículo creado por pruebas automatizadas",
            },
        )

        assert response.status_code == 201, response.text

        articulo = response.json()
        articulos_creados.append(articulo["id"])

        return articulo

    yield crear

    if articulos_creados:
        with SessionLocal() as db:
            db.execute(
                delete(KnowledgeArticle).where(
                    KnowledgeArticle.id.in_(articulos_creados)
                )
            )
            db.commit()
