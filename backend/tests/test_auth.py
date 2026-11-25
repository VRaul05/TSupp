from datetime import timedelta

from app.core.security import now_utc
from app.models.auth import AuthSession, AuditEvent
from sqlalchemy import select


def login(client, email, password="LongPassphrase-for-Tests!"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_health(client):
    assert client.get("/health").status_code == 200


def test_login_me_logout_revoke(client, users):
    response = login(client, users["employee"])
    assert response.status_code == 200, response.text
    headers = {"Authorization": "Bearer " + response.json()["access_token"]}
    assert client.get("/api/auth/me", headers=headers).json()["role"] == "employee"
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_unauthenticated_and_wrong_password(client, users):
    assert client.get("/api/auth/me").status_code == 401
    assert login(client, users["employee"], "bad-credentials").status_code == 401
    assert login(client, "absent@institution.example").status_code == 401


def test_admin_access_is_forbidden_for_employee(client, users):
    token = login(client, users["employee"]).json()["access_token"]
    assert client.get("/api/admin/users", headers={"Authorization": f"Bearer {token}"}).status_code == 403


def test_supervisor_can_provision_account(client, users):
    token = login(client, users["admin"]).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    result = client.post("/api/admin/users", headers=headers, json={
        "name": "Tech", "email": "tech@institution.example",
        "password": "AnotherLongPassphrase!", "role": "support_agent"
    })
    assert result.status_code == 201, result.text
    assert result.json()["role"] == "support_agent"
    assert "password_hash" not in result.text
    assert client.post("/api/admin/users", headers=headers, json={
        "name": "Tech", "email": "tech@institution.example",
        "password": "AnotherLongPassphrase!", "role": "support_agent"
    }).status_code == 409


def test_five_failed_attempts_lock_account(client, users):
    for _ in range(5):
        assert login(client, users["employee"], "wrong-password").status_code == 401
    assert login(client, users["employee"]).status_code == 401


def test_session_inactivity(client, users, db_factory):
    token = login(client, users["employee"]).json()["access_token"]
    with db_factory() as db:
        session = db.scalar(select(AuthSession))
        session.last_seen_at = now_utc() - timedelta(minutes=31)
        db.commit()
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_reset_one_time_and_invalidates_sessions(client, users, db_factory, monkeypatch):
    received = []
    monkeypatch.setattr("app.api.auth.send_password_reset_email",
                        lambda *, recipient, token: received.append((recipient, token)))
    token = login(client, users["employee"]).json()["access_token"]
    response = client.post("/api/auth/password-reset/request", json={"email": users["employee"]})
    assert response.status_code == 200, response.text
    assert len(received) == 1
    raw_reset = received[0][1]
    assert raw_reset not in str(db_factory)
    payload = {"token": raw_reset, "new_password": "NewInstitutionalPass!"}
    assert client.post("/api/auth/password-reset/confirm", json=payload).status_code == 200
    assert client.post("/api/auth/password-reset/confirm", json=payload).status_code == 400
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert login(client, users["employee"], "NewInstitutionalPass!").status_code == 200


def test_only_supervisor_can_read_audit(client, users):
    emp_token = login(client, users["employee"]).json()["access_token"]
    assert client.get("/api/admin/audit", headers={"Authorization": f"Bearer {emp_token}"}).status_code == 403
    admin_token = login(client, users["admin"]).json()["access_token"]
    result = client.get("/api/admin/audit?limit=10", headers={"Authorization": f"Bearer {admin_token}"})
    assert result.status_code == 200
    assert any(e["action"] == "auth.login_success" for e in result.json())


def test_supervisor_can_deactivate_user_and_revoke_access(client, users):
    token_emp = login(client, users["employee"]).json()["access_token"]
    token_admin = login(client, users["admin"]).json()["access_token"]
    headers = {"Authorization": f"Bearer {token_admin}"}
    accounts = client.get("/api/admin/users", headers=headers).json()
    emp = next(x for x in accounts if x["role"] == "employee")
    response = client.patch(f"/api/admin/users/{emp['id']}", headers=headers, json={"is_active": False})
    assert response.status_code == 200, response.text
    assert response.json()["is_active"] is False
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_emp}"}).status_code == 401

def test_supervisor_cannot_demote_self(client, users):
    token_admin = login(client, users["admin"]).json()["access_token"]
    headers = {"Authorization": f"Bearer {token_admin}"}
    admin = next(x for x in client.get("/api/admin/users", headers=headers).json() if x["role"] == "supervisor")
    response = client.patch(f"/api/admin/users/{admin['id']}", headers=headers, json={"role": "employee"})
    assert response.status_code == 409
