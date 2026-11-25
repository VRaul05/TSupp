from logging.config import fileConfig

from alembic import context

from app.core.config import settings
from app.core.database import Base, engine
from app.models import auth, user  # noqa: F401 - ensure Alembic sees all models
from app.models import kb  # noqa: F401 - registrar tablas de la KB en Alembic
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata, compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
from app.models import ai  # noqa: F401  # Registra ai_invocation en Base.metadata