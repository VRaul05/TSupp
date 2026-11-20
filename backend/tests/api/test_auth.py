
def test_health_api(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_agente(client, usuarios):
    user = usuarios["agt_a"]

    response = client.post(
        "/api/auth/login",
        json={
            "email": user["email"],
            "password": user["password"],
        },
    )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["user"]["role"] == "agent"


def test_login_supervisor(client, usuarios):
    user = usuarios["sup_a"]

    response = client.post(
        "/api/auth/login",
        json={
            "email": user["email"],
            "password": user["password"],
        },
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "supervisor"


def test_login_credenciales_incorrectas(client, usuarios):
    user = usuarios["agt_a"]

    response = client.post(
        "/api/auth/login",
        json={
            "email": user["email"],
            "password": "contrasena-incorrecta",
        },
    )

    assert response.status_code == 401


def test_login_usuario_desactivado(client, usuarios):
    user = usuarios["usuario_desactivado"]

    response = client.post(
        "/api/auth/login",
        json={
            "email": user["email"],
            "password": user["password"],
        },
    )

    assert response.status_code == 401


def test_obtener_usuario_actual(client, tokens):
    response = client.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {tokens['agt_a']}"
        },
    )

    assert response.status_code == 200
    assert response.json()["role"] == "agent"


def test_usuario_actual_sin_token(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401
