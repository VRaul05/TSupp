from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    database_url: str
    frontend_origin: str = "http://localhost:5173"

    # A secret must be unique for every deployment and must NEVER be committed.
    jwt_secret: str
    jwt_issuer: str = "tsupp"
    institutional_email_domain: str
    password_reset_base_url: str = "http://localhost:5173/reset-password"

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_starttls: bool = True

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        extra="ignore",
    )


settings = Settings()
if len(settings.jwt_secret.encode("utf-8")) < 32:
    raise RuntimeError("JWT_SECRET must contain at least 32 bytes of entropy")
if not settings.institutional_email_domain.strip():
    raise RuntimeError("INSTITUTIONAL_EMAIL_DOMAIN is required")
