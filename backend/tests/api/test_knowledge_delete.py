def test_supervisor_puede_eliminar_articulo(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["sup_a"],
    )

    articulo_id = articulo["id"]

    response = client.delete(
        f"/api/knowledge/{articulo_id}",
        headers={
            "Authorization": f"Bearer {tokens['sup_a']}"
        },
    )

    assert response.status_code == 204

    # Comprobar que el artículo ya no existe.
    response = client.get(
        f"/api/knowledge/{articulo_id}",
        headers={
            "Authorization": f"Bearer {tokens['agt_a']}"
        },
    )

    assert response.status_code == 404


def test_agente_no_puede_eliminar_articulo(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    response = client.delete(
        f"/api/knowledge/{articulo['id']}",
        headers={
            "Authorization": f"Bearer {tokens['agt_a']}"
        },
    )

    assert response.status_code == 403


def test_usuario_anonimo_no_puede_eliminar_articulo(
    client, tokens, crear_articulo
):
    articulo = crear_articulo(
        client,
        tokens["agt_a"],
    )

    response = client.delete(
        f"/api/knowledge/{articulo['id']}"
    )

    assert response.status_code == 401


def test_crear_articulo_rechaza_datos_invalidos(
    client, tokens
):
    headers = {
        "Authorization": f"Bearer {tokens['agt_a']}"
    }

    response = client.post(
        "/api/knowledge",
        headers=headers,
        json={
            "title": "",
            "category": "QA",
            "content": "Contenido de prueba",
        },
    )

    assert response.status_code == 422

    response = client.post(
        "/api/knowledge",
        headers=headers,
        json={
            "title": "Artículo QA",
            "category": "QA",
            "content": "",
        },
    )

    assert response.status_code == 422