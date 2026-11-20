
from pathlib import Path
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]

ENV_FILE = os.getenv("ENV_FILE", str(PROJECT_ROOT / ".env"))


class Settings(BaseSettings):
    database_url: str
    frontend_origin: str = "http://localhost:5173"
    kb_admin_key: str = ""

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        extra="ignore",
    )


settings = Settings()
