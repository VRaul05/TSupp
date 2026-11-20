
from pathlib import Path

import yaml


BACKEND_DIR = Path(__file__).resolve().parents[2]
MATRIZ = BACKEND_DIR / "config" / "matriz_permisos_api.yaml"


def test_pytest_funciona():
    assert 2 + 2 == 4


def test_backend_seleccionado_es_qa():
    from app.core.config import settings

    assert "tsupp_qa" in settings.database_url


def test_matriz_existe():
    assert MATRIZ.exists()


def test_matriz_yaml_valido():
    with open(MATRIZ, encoding="utf-8") as archivo:
        datos = yaml.safe_load(archivo)

    assert isinstance(datos, dict)

from pathlib import Path

import yaml


BACKEND_DIR = Path(__file__).resolve().parents[2]
MATRIZ = BACKEND_DIR / "config" / "matriz_permisos_api.yaml"


def test_pytest_funciona():
    assert 2 + 2 == 4


def test_backend_seleccionado_es_qa():
    from app.core.config import settings

    assert "tsupp_qa" in settings.database_url


def test_matriz_existe():
    assert MATRIZ.exists()


def test_matriz_yaml_valido():
    with open(MATRIZ, encoding="utf-8") as archivo:
        datos = yaml.safe_load(archivo)

    assert "endpoints" in datos
    assert "transiciones" in datos
    assert "actores" in datos
