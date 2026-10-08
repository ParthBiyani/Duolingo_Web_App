"""FastAPI application: settings, middleware, error handlers and routes."""

import logging
import re
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Request, Response
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import __version__
from app.core.config import Settings, get_settings
from app.core.db import engine, get_db
from app.core.errors import AppError, register_exception_handlers
from app.core.logging import configure_logging, request_id_var
from app.schemas.demo import HealthResponse
from app.seed.runner import is_seeded

logger = logging.getLogger(__name__)

# An incoming X-Request-ID is reused only if it looks like an id, not arbitrary text.
_REQUEST_ID = re.compile(r"[A-Za-z0-9._-]{1,128}")

health_router = APIRouter(tags=["health"])


@health_router.get("/api/health", response_model=HealthResponse, summary="Liveness check")
def health(db: Annotated[Session, Depends(get_db)]) -> HealthResponse:
    """Report that the API is up, the database answers and whether it has been seeded."""
    try:
        seeded = is_seeded(db)
    except SQLAlchemyError as exc:
        raise AppError(
            503, "db_unavailable", "Service Unavailable", "The database is unavailable."
        ) from exc
    return HealthResponse(status="ok", db="ok", seeded=seeded, version=__version__)


async def add_request_context(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Give each request an id (echoed as ``X-Request-ID`` and in the logs) and set headers."""
    incoming = request.headers.get("x-request-id", "")
    request_id = incoming if _REQUEST_ID.fullmatch(incoming) else uuid.uuid4().hex
    token = request_id_var.set(request_id)
    try:
        response = await call_next(request)
    finally:
        request_id_var.reset(token)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"  # learner state changes on every action
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        configure_logging(settings.log_level)
        logger.info(
            "API %s starting (env=%s, demo tools %s)",
            __version__,
            settings.app_env,
            "on" if settings.demo_tools else "off",
        )
        yield
        engine.dispose()

    app = FastAPI(
        title="Duolingo Web App API",
        version=__version__,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    register_exception_handlers(app)
    app.middleware("http")(add_request_context)
    app.include_router(health_router)
    return app


app = create_app()
