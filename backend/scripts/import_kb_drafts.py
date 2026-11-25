"""Import G-04 articles as DRAFTS (no publication, no embeddings).

From backend/: python -m scripts.import_kb_drafts --dry-run
               python -m scripts.import_kb_drafts --importar
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.kb_processing import normalize_source_date, parse_article, split_article

ROOT = Path(__file__).resolve().parents[1] / "knowledgebase"


def load_articles():
    articles = [parse_article(p) for p in sorted((ROOT / "procedimientos").glob("*.md"))]
    if len(articles) != 9 or len({a.meta["id"] for a in articles}) != 9:
        raise ValueError("Se esperaban exactamente 9 artículos G-04 únicos")
    return articles


def load_questions():
    dataset = json.loads((ROOT / "eval" / "dataset_evaluacion.json").read_text(encoding="utf-8"))
    questions = dataset["preguntas"]
    if len(questions) != 112 or len({q["id"] for q in questions}) != 112:
        raise ValueError("El dataset G-04 no contiene 112 preguntas únicas")
    return dataset



def import_all() -> None:
    from app.core.database import SessionLocal
    from app.models import user  # noqa: F401
    from app.models.kb import KbDocument, KbDocumentVersion, KbEvalQuestion


    articles, data = load_articles(), load_questions()
    with SessionLocal.begin() as db:
        for article in articles:
            meta = article.meta
            doc = db.get(KbDocument, meta["id"])
            if doc is None:
                doc = KbDocument(id=meta["id"], current_version=1, authorized_version=None, status="draft")
                db.add(doc)
                version_no = 1
            else:
                latest = db.get(KbDocumentVersion, (doc.id, doc.current_version))
                if latest is not None and latest.sha256 == article.content_hash:
                    print(f"  = {doc.id}: sin cambios")
                    continue
                version_no = doc.current_version + 1
                doc.current_version = version_no
                # If an earlier version is authorized, keep it authorized until explicitly replaced.
            version = KbDocumentVersion(
                document_id=doc.id, version_no=version_no, title=str(meta["titulo"]),
                kind=str(meta["tipo"]), category=str(meta["categoria"]),
                subcategory=str(meta.get("subcategoria") or "") or None,
                roles_allowed=list(meta["roles_permitidos"]),
                sensitivity=str(meta.get("sensibilidad") or "interna"), language=str(meta["idioma"]),
                tags=[str(x) for x in meta.get("etiquetas", [])],
                source_procedure=str(meta.get("procedimiento_origen") or "") or None,
                source_revision=str(meta.get("revision_origen") or "") or None,
                source_review_date=normalize_source_date(meta.get("fecha_revision_origen")),
                source_file=str(meta.get("archivo_fuente") or "") or None,
                content_md=article.content_md, sha256=article.content_hash,
            )
            db.add(version)
            print(f"  + {doc.id}: versión {version_no} importada como borrador")

        for q in data["preguntas"]:
            record = db.get(KbEvalQuestion, q["id"])
            if record is None:
                record = KbEvalQuestion(id=q["id"])
                db.add(record)
            record.question = q["pregunta"]
            record.expected_answer = q.get("respuesta_esperada")
            record.relevant_docs = list(q["articulos_relevantes"])
            record.kind = q["tipo"]
            record.should_answer = bool(q["debe_responder"])
            record.role = q["rol"]
            record.difficulty = q.get("dificultad")
            record.keywords = list(q.get("palabras_clave", []))
            record.dataset_version = str(data["version"])
    print("Importación completada: borradores y dataset; ningún artículo autorizado automáticamente")


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--importar", action="store_true")
    args = parser.parse_args()
    articles, data = load_articles(), load_questions()
    print(f"Validación: {len(articles)} artículos / {len(data['preguntas'])} preguntas")
    if args.dry_run:
        for article in articles:
            print(f"  {article.meta['id']}: {len(split_article(article))} fragmentos, roles {article.meta['roles_permitidos']}")
        print("Dry-run: sin conexión ni cambios en PostgreSQL")
    else:
        import_all()


if __name__ == "__main__":
    main()
