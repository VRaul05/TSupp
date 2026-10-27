"""MVP knowledge API. Dev-only X-KB-Admin-Key protects writes; replace with RBAC/JWT before deployment."""
from datetime import datetime
from secrets import compare_digest
from uuid import UUID
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.knowledge import KnowledgeArticle, KnowledgeVersion

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

def db_session():
    with SessionLocal() as session:
        yield session

def admin(x_kb_admin_key: str | None = Header(default=None)):
    if not settings.kb_admin_key or not x_kb_admin_key or not compare_digest(x_kb_admin_key, settings.kb_admin_key):
        raise HTTPException(status_code=403, detail="Administrative key required")

class ArticleInput(BaseModel):
    title: str = Field(min_length=1, max_length=250)
    category: str = Field(default="General", min_length=1, max_length=100)
    content: str = Field(min_length=1)
    note: str = Field(default="", max_length=500)

class EditInput(BaseModel):
    content: str = Field(min_length=1)
    note: str = Field(default="", max_length=500)
    title: str | None = Field(default=None, min_length=1, max_length=250)

class VersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    number: int
    content: str
    note: str
    created_at: datetime

class ArticleOut(BaseModel):
    id: UUID
    title: str
    category: str
    status: str
    current_version: int
    authorized_version: int | None
    content: str

def get_article(db: Session, id: UUID) -> KnowledgeArticle:
    a = db.get(KnowledgeArticle, id)
    if a is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return a

def serial(db: Session, a: KnowledgeArticle, public: bool = False) -> ArticleOut:
    number = a.authorized_version if public else a.current_version
    v = db.scalar(select(KnowledgeVersion).where(KnowledgeVersion.article_id == a.id, KnowledgeVersion.number == number))
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    return ArticleOut(id=a.id,title=a.title,category=a.category,status=a.status,current_version=a.current_version,authorized_version=a.authorized_version,content=v.content)

@router.get("/public", response_model=list[ArticleOut])
def public_search(q: str = "", db: Session = Depends(db_session)):
    stmt = select(KnowledgeArticle).where(KnowledgeArticle.status == "authorized", KnowledgeArticle.authorized_version.is_not(None))
    if q:
        stmt = stmt.where(KnowledgeArticle.title.ilike(f"%{q}%"))
    return [serial(db,a,public=True) for a in db.scalars(stmt).all()]

@router.get("/public/{id}",response_model=ArticleOut)
def public_article(id: UUID,db: Session = Depends(db_session)):
    a=get_article(db,id)
    if a.status != "authorized" or a.authorized_version is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return serial(db,a,public=True)

@router.get("",response_model=list[ArticleOut],dependencies=[Depends(admin)])
def list_all(db:Session=Depends(db_session)):
    return [serial(db,a) for a in db.scalars(select(KnowledgeArticle)).all()]

@router.post("",response_model=ArticleOut,status_code=201,dependencies=[Depends(admin)])
def create(data:ArticleInput,db:Session=Depends(db_session)):
    a=KnowledgeArticle(title=data.title,category=data.category,status="draft",current_version=1)
    db.add(a); db.flush()
    db.add(KnowledgeVersion(article_id=a.id,number=1,content=data.content,note=data.note))
    db.commit();return serial(db,a)

@router.get("/{id}",response_model=ArticleOut,dependencies=[Depends(admin)])
def detail(id:UUID,db:Session=Depends(db_session)):
    return serial(db,get_article(db,id))

@router.put("/{id}",response_model=ArticleOut,dependencies=[Depends(admin)])
def edit(id:UUID,data:EditInput,db:Session=Depends(db_session)):
    a=get_article(db,id)
    if data.title is not None:a.title=data.title
    a.current_version+=1
    # A content edit always unpublishes the article pending reapproval.
    a.status="draft";a.authorized_version=None
    db.add(KnowledgeVersion(article_id=a.id,number=a.current_version,content=data.content,note=data.note))
    db.commit();return serial(db,a)

@router.get("/{id}/versions",response_model=list[VersionOut],dependencies=[Depends(admin)])
def versions(id:UUID,db:Session=Depends(db_session)):
    get_article(db,id)
    return db.scalars(select(KnowledgeVersion).where(KnowledgeVersion.article_id==id).order_by(KnowledgeVersion.number.desc())).all()

@router.post("/{id}/restore/{version}",response_model=ArticleOut,dependencies=[Depends(admin)])
def restore(id:UUID,version:int,db:Session=Depends(db_session)):
    a=get_article(db,id)
    old=db.scalar(select(KnowledgeVersion).where(KnowledgeVersion.article_id==id,KnowledgeVersion.number==version))
    if not old:raise HTTPException(status_code=404,detail="Version not found")
    a.current_version+=1;a.status="draft";a.authorized_version=None
    db.add(KnowledgeVersion(article_id=id,number=a.current_version,content=old.content,note=f"Restored from version {version}"))
    db.commit();return serial(db,a)

@router.post("/{id}/submit",response_model=ArticleOut,dependencies=[Depends(admin)])
def submit(id:UUID,db:Session=Depends(db_session)):
    a=get_article(db,id)
    if a.status!="draft":raise HTTPException(status_code=409,detail="Only drafts can be submitted")
    a.status="under_review";db.commit();return serial(db,a)

@router.post("/{id}/authorize",response_model=ArticleOut,dependencies=[Depends(admin)])
def authorize(id:UUID,db:Session=Depends(db_session)):
    a=get_article(db,id)
    if a.status!="under_review":raise HTTPException(status_code=409,detail="Submit article for review first")
    a.status="authorized";a.authorized_version=a.current_version;db.commit();return serial(db,a)

@router.post("/{id}/revoke",response_model=ArticleOut,dependencies=[Depends(admin)])
def revoke(id:UUID,db:Session=Depends(db_session)):
    a=get_article(db,id)
    if a.status!="authorized":raise HTTPException(status_code=409,detail="Only authorized articles may be revoked")
    a.status="revoked";a.authorized_version=None;db.commit();return serial(db,a)

@router.delete("/{id}",status_code=204,dependencies=[Depends(admin)])
def delete(id:UUID,db:Session=Depends(db_session)):
    db.delete(get_article(db,id));db.commit()
