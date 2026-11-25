import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import quote

from app.core.config import settings


def smtp_is_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


def send_password_reset_email(*, recipient: str, token: str) -> None:
    if not smtp_is_configured():
        raise RuntimeError("Institutional SMTP is not configured")

    url = f"{settings.password_reset_base_url}?token={quote(token, safe='')}"
    message = EmailMessage()
    message["Subject"] = "TSupp - Restablecer contraseña"
    message["From"] = settings.smtp_from
    message["To"] = recipient
    message.set_content(
        "Se solicitó restablecer tu contraseña de TSupp. "
        "Si no lo solicitaste, ignora este mensaje.\n\n"
        f"El enlace es válido durante 15 minutos:\n{url}\n"
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_use_starttls:
            server.starttls(context=ssl.create_default_context())
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
