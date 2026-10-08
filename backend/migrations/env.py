"""Alembic environment: migrates the database configured by the app settings."""

from logging.config import fileConfig
from typing import Literal

from alembic import context
from alembic.autogenerate.api import AutogenContext
from sqlalchemy.types import TypeDecorator

from app.core.config import get_settings
from app.core.db import create_db_engine
from app.models import Base

config = context.config

# Callers that run migrations in-process (the test suite) keep their own logging setup.
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def database_url() -> str:
    """An explicit ``sqlalchemy.url`` (set by the tests) wins over the app settings."""
    return config.get_main_option("sqlalchemy.url") or get_settings().database_url


def render_item(type_: str, obj: object, _context: AutogenContext) -> str | Literal[False]:
    """Write the app's custom column types into migrations as their storage type (TEXT).

    A migration is a frozen record of the schema, so it must not import application code.
    """
    if type_ == "type" and isinstance(obj, TypeDecorator):
        return f"sa.{type(obj.impl).__name__}()"
    return False  # everything else renders as usual


def run_migrations_offline() -> None:
    """Emit the migration SQL as a script instead of running it (``alembic upgrade --sql``)."""
    context.configure(
        url=database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        render_as_batch=True,
        render_item=render_item,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # SQLite cannot alter most of a table in place, so render_as_batch makes Alembic rebuild
    # the table (create, copy, drop, rename). Foreign keys stay OFF while that happens, or
    # dropping the old table would cascade into its children.
    engine = create_db_engine(database_url(), enforce_foreign_keys=False)
    try:
        with engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                render_as_batch=True,
                render_item=render_item,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
