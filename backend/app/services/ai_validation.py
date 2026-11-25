"""Pure, testable validation helpers for grounded AI suggestions.

These checks validate document references, NOT factual grounding. The latter
requires evaluation against the cited document text.
"""
from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field, ValidationError


class Suggestion(BaseModel):
    pasos: list[str] = Field(min_length=1, max_length=6)
    referencias: list[str] = Field(min_length=1, max_length=5)


class StructuredAnswer(BaseModel):
    resumen: str = Field(min_length=1, max_length=1200)
    sugerencias: list[Suggestion] = Field(default_factory=list, max_length=3)


def make_output_schema() -> dict[str, Any]:
    """Explicit Ollama output schema (compatible with JSON schema output)."""
    return StructuredAnswer.model_json_schema()


def validate_ollama_answer(raw_text: str, source_keys: set[str]) -> StructuredAnswer | None:
    """Fail closed when output shape/citations are invalid or absent."""
    try:
        answer = StructuredAnswer.model_validate_json(raw_text)
    except (ValidationError, ValueError, TypeError, json.JSONDecodeError):
        return None
    if not answer.sugerencias:
        return None
    for suggestion in answer.sugerencias:
        if not all(step.strip() for step in suggestion.pasos):
            return None
        if not all(key in source_keys for key in suggestion.referencias):
            return None
    return answer
