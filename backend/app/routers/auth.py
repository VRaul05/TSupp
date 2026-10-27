
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.core.security import (
    create_access_token,
    verify_password,
)
from app.models.user import User


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


class LoginInput(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1)


class UserOutput(BaseModel):
    id: str
    name: str
    email: str
    role: str


def serialize_user(user: User) -> UserOutput:
    return UserOutput(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
    )


@router.post("/login")
def login(
    data: LoginInput,
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(
            User.email == data.email.strip().lower()
        )
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(
            data.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas",
        )

    access_token = create_access_token(
        user.id,
        user.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.get("/me", response_model=UserOutput)
def me(
    user: User = Depends(get_current_user),
):
    return serialize_user(user)
