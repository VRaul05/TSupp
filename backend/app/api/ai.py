"""Authenticated local AI endpoints. No tool execution or ticket writes."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, Db
from app.services.ai_rag import suggest_from_kb

router = APIRouter(prefix="/api/ia", tags=["IA / RAG"])


class SuggestRequest(BaseModel):
    pregunta: str = Field(min_length=4, max_length=500)


@router.post("/sugerir")
def suggest(payload: SuggestRequest, db: Db, user: CurrentUser):
    """RAG experimental: citation identifiers validated; grounding under evaluation."""
    return suggest_from_kb(db=db, user=user, question=payload.pregunta.strip())
