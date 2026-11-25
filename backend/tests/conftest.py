import os

# Intentionally fake values for isolated automated tests only.
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["JWT_SECRET"] = "tests-only-not-for-deployment-123456789012345678901234567890"
os.environ["INSTITUTIONAL_EMAIL_DOMAIN"] = "institution.example"
os.environ["SMTP_HOST"] = "localhost"
os.environ["SMTP_FROM"] = "noreply@institution.example"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.database import Base
from app.main import app
from app.models import auth, user  # noqa


@pytest.fixture
def db_factory():
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autoflush=False)
    yield factory
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def client(db_factory):
    def session_override():
        with db_factory() as db:
            yield db
    app.dependency_overrides[get_db] = session_override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def users(db_factory):
    from app.core.security import hash_password
    from app.models.user import User
    with db_factory() as db:
        admin = User(name="Supervisor", email="admin@institution.example", role="supervisor",
                     password_hash=hash_password("LongPassphrase-for-Tests!"))
        employee = User(name="Employee", email="emp@institution.example", role="employee",
                        password_hash=hash_password("LongPassphrase-for-Tests!"))
        db.add_all([admin, employee])
        db.commit()
    return {"admin": "admin@institution.example", "employee": "emp@institution.example"}
