
from pathlib import Path

import pytest
import yaml


BACKEND_DIR = Path(__file__).resolve().parents[2]
MATRIZ = BACKEND_DIR / "config" / "matriz_permisos_api.yaml"


def cargar_matriz():
    with open(MATRIZ, encoding="utf-8") as archivo:
        return yaml.safe_load(archivo)


def cargar_casos():
    datos = cargar_matriz()
    casos = []

    for endpoint in datos["endpoints"]:
        for actor, expected_status in endpoint["permisos"].items():
            casos.append(
                pytest.param(
                    endpoint,
                    actor,
                    expected_status,
                    id=f"{endpoint['metodo']}-{endpoint['ruta']}-{actor}",
                )
            )

    return casos


def obtener_headers(actor, actores, tokens):
    token_fixture = actores[actor]["token_fixture"]

    if token_fixture is None:
        return {}

    return {
        "Authorization": f"Bearer {tokens[token_fixture]}"
    }


def preparar_articulo(
    client,
    tokens,
    crear_articulo,
    preparacion,
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    article_id = articulo["id"]

    headers_agent = {
        "Authorization": f"Bearer {tokens['agt_a']}"
    }

    headers_supervisor = {
        "Authorization": f"Bearer {tokens['sup_a']}"
    }

    if preparacion == "draft":
        return article_id

    if preparacion == "under_review":
        response = client.post(
            f"/api/knowledge/{article_id}/submit",
            headers=headers_agent,
        )
        assert response.status_code == 200, response.text

    elif preparacion == "authorized":
        response = client.post(
            f"/api/knowledge/{article_id}/submit",
            headers=headers_agent,
        )
        assert response.status_code == 200, response.text

        response = client.post(
            f"/api/knowledge/{article_id}/authorize",
            headers=headers_supervisor,
        )
        assert response.status_code == 200, response.text

    elif preparacion == "versioned":
        response = client.put(
            f"/api/knowledge/{article_id}",
            headers=headers_agent,
            json={
                "content": "Segunda versión del artículo",
                "note": "Preparación de prueba",
            },
        )
        assert response.status_code == 200, response.text

    else:
        raise ValueError(
            f"Preparación de artículo desconocida: {preparacion}"
        )

    return article_id


@pytest.mark.parametrize(
    "endpoint, actor, expected_status",
    cargar_casos(),
)
def test_permisos_endpoints(
    client,
    tokens,
    crear_articulo,
    endpoint,
    actor,
    expected_status,
):
    datos = cargar_matriz()
    actores = datos["actores"]

    headers = obtener_headers(actor, actores, tokens)

    article_id = None
    preparacion = endpoint.get("preparacion")

    if preparacion:
        article_id = preparar_articulo(
            client,
            tokens,
            crear_articulo,
            preparacion,
        )

    ruta = endpoint["ruta"]

    if article_id:
        ruta = ruta.format(article_id=article_id)

    response = client.request(
        method=endpoint["metodo"],
        url=ruta,
        headers=headers,
        json=endpoint.get("body"),
    )

    assert response.status_code == expected_status, (
        f"Operación: {endpoint['nombre']} | "
        f"Endpoint: {ruta} | "
        f"Actor: {actor} | "
        f"Esperado: {expected_status} | "
        f"Obtenido: {response.status_code} | "
        f"Respuesta: {response.text}"
    )
