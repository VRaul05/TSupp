import json

from app.services.ai_validation import make_output_schema, validate_ollama_answer


def test_valid_grounded_shape():
    body = json.dumps({"resumen": "Reporte a Informática", "sugerencias": [
        {"pasos": ["Llame al departamento"], "referencias": ["S1"]}]})
    parsed = validate_ollama_answer(body, {"S1", "S2"})
    assert parsed is not None
    assert parsed.sugerencias[0].referencias == ["S1"]


def test_reject_fabricated_citation():
    body = json.dumps({"resumen": "Reporte", "sugerencias": [
        {"pasos": ["Formatee su equipo"], "referencias": ["S99"]}]})
    assert validate_ollama_answer(body, {"S1"}) is None


def test_reject_malformed_json():
    assert validate_ollama_answer("not json", {"S1"}) is None


def test_reject_no_suggestions():
    body = json.dumps({"resumen": "No se conoce", "sugerencias": []})
    assert validate_ollama_answer(body, {"S1"}) is None


def test_reject_excess_suggestions():
    body = json.dumps({"resumen": "Reporte", "sugerencias": [
        {"pasos": ["Paso"], "referencias": ["S1"]} for _ in range(4)]})
    assert validate_ollama_answer(body, {"S1"}) is None


def test_output_schema_fields():
    s = make_output_schema()
    assert "sugerencias" in s["properties"]
