"""Pure KB ingestion helpers and local Ollama embeddings. No access control here."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from hashlib import sha256
from pathlib import Path
import math
import os
import re

import httpx
import yaml

ALLOWED_SOURCE_ROLES = {"empleado", "agente", "supervisor"}
ROLE_MAP = {"employee": "empleado", "support_agent": "agente", "supervisor": "supervisor"}
EMBED_DIMS = 1024
MAX_PART = 1050


@dataclass(frozen=True)
class Article:
    meta: dict
    content_md: str
    content_hash: str


def parse_article(path: Path) -> Article:
    raw = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
    if not match:
        raise ValueError(f"{path.name}: falta encabezado YAML")
    meta = yaml.safe_load(match.group(1))
    if not isinstance(meta, dict):
        raise ValueError(f"{path.name}: metadatos inválidos")
    required = ("id", "titulo", "tipo", "categoria", "roles_permitidos", "idioma")
    if any(not meta.get(x) for x in required):
        raise ValueError(f"{path.name}: metadatos obligatorios incompletos")
    roles = meta["roles_permitidos"]
    if not isinstance(roles, list) or not roles or set(roles) - ALLOWED_SOURCE_ROLES:
        raise ValueError(f"{path.name}: roles_permitidos inválidos")
    if meta["idioma"] != "es-MX":
        raise ValueError(f"{path.name}: idioma inválido")
    if len(str(meta["id"])) > 50:
        raise ValueError(f"{path.name}: id demasiado largo")
    body = match.group(2).strip()
    if not body:
        raise ValueError(f"{path.name}: artículo sin contenido")
    return Article(meta=meta, content_md=body, content_hash=sha256(raw.encode("utf-8")).hexdigest())


def _paragraph_chunks(text: str, max_chars: int = MAX_PART) -> list[str]:
    """Split on paragraphs/words, not at arbitrary character offsets."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    pieces: list[str] = []
    current = ""
    for para in paragraphs:
        if len(para) > max_chars:
            if current:
                pieces.append(current)
                current = ""
            words = para.split()
            for word in words:
                if len(word) > max_chars:
                    raise ValueError("Documento contiene token individual demasiado largo")
                candidate = f"{current} {word}" if current else word
                if len(candidate) > max_chars:
                    pieces.append(current)
                    current = word
                else:
                    current = candidate
            continue
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) > max_chars:
            pieces.append(current)
            current = para
        else:
            current = candidate
    if current:
        pieces.append(current)
    return pieces


def split_article(article: Article) -> list[tuple[str, str]]:
    parts = re.split(r"^## +(.+)$", article.content_md, flags=re.M)
    sections = []
    introductory = re.sub(r"^# .*\n?", "", parts[0].strip(), flags=re.M).strip()
    if introductory:
        sections.append(("Introducción", introductory))
    sections.extend((parts[i].strip(), parts[i + 1].strip()) for i in range(1, len(parts), 2))
    chunks: list[tuple[str, str]] = []
    for heading, body in sections:
        for segment in _paragraph_chunks(body):
            chunks.append((heading, f"{article.meta['titulo']}\nSección: {heading}\n\n{segment}"))
    if not chunks:
        raise ValueError(f"{article.meta['id']}: no produce fragmentos")
    return chunks


def split_version(title: str, content_md: str) -> list[tuple[str, str]]:
    return split_article(Article({"titulo": title, "id": "(version)"}, content_md, ""))


def embed_texts(texts: list[str]) -> tuple[list[list[float]], str]:
    """Returns validated 1024-dimensional vectors from the local Ollama service."""
    if not texts:
        raise ValueError("No hay texto para vectorizar")
    model = os.getenv("TSUPP_EMBED_MODEL", "bge-m3")
    base = os.getenv("TSUPP_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
    with httpx.Client(timeout=180) as client:
        response = client.post(f"{base}/api/embed", json={"model": model, "input": texts})
        response.raise_for_status()
        vectors = response.json().get("embeddings")
    if not isinstance(vectors, list) or len(vectors) != len(texts):
        raise RuntimeError("Ollama devolvió un número incorrecto de embeddings")
    for vector in vectors:
        if not isinstance(vector, list) or len(vector) != EMBED_DIMS or not all(isinstance(x, (int, float)) and math.isfinite(x) for x in vector):
            raise RuntimeError("Ollama devolvió un vector inválido o de dimensión distinta de 1024")
    return vectors, model


def normalize_source_date(value: object) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))
