from pathlib import Path

import pytest

from app.services.kb_processing import EMBED_DIMS, ROLE_MAP, _paragraph_chunks, parse_article, split_article

ROOT = Path(__file__).resolve().parents[1] / "knowledgebase" / "procedimientos"


def test_nine_articles_parse_to_valid_chunks():
    files = sorted(ROOT.glob("*.md"))
    assert len(files) == 9
    ids = set()
    for path in files:
        article = parse_article(path)
        assert article.meta["id"] not in ids
        ids.add(article.meta["id"])
        assert split_article(article)


def test_chunk_split_preserves_words():
    data = "palabra " * 350
    chunks = _paragraph_chunks(data, max_chars=95)
    assert len(chunks) > 3
    assert all(len(c) <= 95 for c in chunks)
    assert " ".join(" ".join(chunks).split()) == " ".join(data.split())


def test_actual_roles_are_mapped_explicitly():
    assert ROLE_MAP == {"employee": "empleado", "support_agent": "agente", "supervisor": "supervisor"}
    assert EMBED_DIMS == 1024
