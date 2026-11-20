import uuid

import pytest
from sqlalchemy import delete

from app.core.database import SessionLocal
from app.models.knowledge import KnowledgeArticle



def test_crear_articulo_como_agente(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    assert articulo["title"].startswith("QA Article")
    assert articulo["status"] == "draft"
    assert articulo["current_version"] == 1
    assert articulo["authorized_version"] is None
    assert articulo["content"] == "Contenido inicial"


def test_editar_articulo_crea_nueva_version(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    response = client.put(
        f"/api/knowledge/{articulo['id']}",
        headers={"Authorization": f"Bearer {tokens['agt_a']}"},
        json={
            "content": "Contenido actualizado",
            "note": "Segunda versión",
        },
    )

    assert response.status_code == 200

    actualizado = response.json()

    assert actualizado["current_version"] == 2
    assert actualizado["status"] == "draft"
    assert actualizado["authorized_version"] is None
    assert actualizado["content"] == "Contenido actualizado"

    historial = client.get(
        f"/api/knowledge/{articulo['id']}/versions",
        headers={"Authorization": f"Bearer {tokens['agt_a']}"},
    )

    assert historial.status_code == 200

    versiones = historial.json()

    assert len(versiones) == 2
    assert versiones[0]["number"] == 2
    assert versiones[1]["number"] == 1


def test_ciclo_documental_completo(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    articulo_id = articulo["id"]

    # Enviar a revisión.
    response = client.post(
        f"/api/knowledge/{articulo_id}/submit",
        headers={"Authorization": f"Bearer {tokens['agt_a']}"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "under_review"

    # Autorizar como supervisor.
    response = client.post(
        f"/api/knowledge/{articulo_id}/authorize",
        headers={"Authorization": f"Bearer {tokens['sup_a']}"},
    )

    assert response.status_code == 200

    autorizado = response.json()

    assert autorizado["status"] == "authorized"
    assert autorizado["authorized_version"] == 1

    # Comprobar que aparece en la búsqueda pública.
    response = client.get(
        "/api/knowledge/public",
        params={"q": autorizado["title"]},
    )

    assert response.status_code == 200

    resultados = response.json()

    assert any(item["id"] == articulo_id for item in resultados)

    # Consultar el artículo público directamente.
    response = client.get(
        f"/api/knowledge/public/{articulo_id}"
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Contenido inicial"

    # Revocar como supervisor.
    response = client.post(
        f"/api/knowledge/{articulo_id}/revoke",
        headers={"Authorization": f"Bearer {tokens['sup_a']}"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "revoked"
    assert response.json()["authorized_version"] is None

    # Comprobar que ya no está disponible públicamente.
    response = client.get(
        f"/api/knowledge/public/{articulo_id}"
    )

    assert response.status_code == 404

    response = client.get(
        "/api/knowledge/public",
        params={"q": autorizado["title"]},
    )

    assert response.status_code == 200
    assert all(
        item["id"] != articulo_id
        for item in response.json()
    )


def test_agente_no_puede_autorizar_ni_revocar(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    articulo_id = articulo["id"]
    headers = {
        "Authorization": f"Bearer {tokens['agt_a']}"
    }

    response = client.post(
        f"/api/knowledge/{articulo_id}/authorize",
        headers=headers,
    )

    assert response.status_code == 403

    response = client.post(
        f"/api/knowledge/{articulo_id}/revoke",
        headers=headers,
    )

    assert response.status_code == 403


def test_transiciones_invalidas(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    articulo_id = articulo["id"]

    supervisor_headers = {
        "Authorization": f"Bearer {tokens['sup_a']}"
    }

    agent_headers = {
        "Authorization": f"Bearer {tokens['agt_a']}"
    }

    # No se puede autorizar un borrador.
    response = client.post(
        f"/api/knowledge/{articulo_id}/authorize",
        headers=supervisor_headers,
    )

    assert response.status_code == 409

    # Enviar el borrador a revisión.
    response = client.post(
        f"/api/knowledge/{articulo_id}/submit",
        headers=agent_headers,
    )

    assert response.status_code == 200

    # No se puede enviar nuevamente si ya está en revisión.
    response = client.post(
        f"/api/knowledge/{articulo_id}/submit",
        headers=agent_headers,
    )

    assert response.status_code == 409

    # Autorizar el artículo.
    response = client.post(
        f"/api/knowledge/{articulo_id}/authorize",
        headers=supervisor_headers,
    )

    assert response.status_code == 200

    # No se puede autorizar nuevamente.
    response = client.post(
        f"/api/knowledge/{articulo_id}/authorize",
        headers=supervisor_headers,
    )

    assert response.status_code == 409


def test_restaurar_version_anterior(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
        content="Contenido de la versión uno",
    )

    articulo_id = articulo["id"]

    # Crear la segunda versión.
    response = client.put(
        f"/api/knowledge/{articulo_id}",
        headers={"Authorization": f"Bearer {tokens['agt_a']}"},
        json={
            "content": "Contenido de la versión dos",
            "note": "Segunda versión",
        },
    )

    assert response.status_code == 200
    assert response.json()["current_version"] == 2

    # Restaurar la primera versión como supervisor.
    response = client.post(
        f"/api/knowledge/{articulo_id}/restore/1",
        headers={"Authorization": f"Bearer {tokens['sup_a']}"},
    )

    assert response.status_code == 200

    restaurado = response.json()

    # La restauración genera una versión nueva.
    assert restaurado["current_version"] == 3
    assert restaurado["status"] == "draft"
    assert restaurado["authorized_version"] is None
    assert restaurado["content"] == "Contenido de la versión uno"

    # Comprobar el historial.
    response = client.get(
        f"/api/knowledge/{articulo_id}/versions",
        headers={"Authorization": f"Bearer {tokens['sup_a']}"},
    )

    assert response.status_code == 200

    versiones = response.json()

    assert len(versiones) == 3
    assert versiones[0]["number"] == 3
    assert versiones[0]["content"] == "Contenido de la versión uno"
    assert "Restored from version 1" in versiones[0]["note"]


def test_agente_no_puede_restaurar_version(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    response = client.post(
        f"/api/knowledge/{articulo['id']}/restore/1",
        headers={"Authorization": f"Bearer {tokens['agt_a']}"},
    )

    assert response.status_code == 403


def test_empleado_no_puede_crear_articulos(
    client, tokens
):
    response = client.post(
        "/api/knowledge",
        headers={"Authorization": f"Bearer {tokens['emp_a']}"},
        json={
            "title": "QA Employee Article",
            "category": "QA",
            "content": "Contenido de prueba",
            "note": "",
        },
    )

    assert response.status_code == 403


def test_no_se_puede_restaurar_version_inexistente(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["sup_a"],
    )

    response = client.post(
        f"/api/knowledge/{articulo['id']}/restore/99",
        headers={"Authorization": f"Bearer {tokens['sup_a']}"},
    )

    assert response.status_code == 404