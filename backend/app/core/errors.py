"""Error responses as RFC 9457 problem details: ``{type, title, status, detail, code}``.

``code`` is a stable machine-readable identifier (for example ``"no_hearts"``) that the
frontend switches on; ``title`` and ``detail`` are written for people.
"""

import logging
from collections.abc import Mapping
from http import HTTPStatus
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)

PROBLEM_JSON = "application/problem+json"

# Codes for the errors the framework raises itself, such as an unknown route.
_FRAMEWORK_ERROR_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    429: "too_many_requests",
}


class AppError(Exception):
    """An expected failure the client can act on, e.g. ``AppError(409, "no_hearts", ...)``."""

    def __init__(self, status: int, code: str, title: str, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.code = code
        self.title = title
        self.detail = detail


def problem_response(
    status: int,
    code: str,
    title: str,
    detail: str,
    *,
    headers: Mapping[str, str] | None = None,
    **extensions: Any,
) -> JSONResponse:
    """Build a problem details response; ``extensions`` become extra members of the body."""
    body = {
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
        "code": code,
        **extensions,
    }
    return JSONResponse(body, status_code=status, headers=headers, media_type=PROBLEM_JSON)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(HTTPException, _handle_http_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(Exception, _handle_unexpected_error)


# Starlette calls each handler only with the exception class it was registered for, so the
# casts below are safe; the parameters are typed Exception to match Starlette's signature.


async def _handle_app_error(_request: Request, exc: Exception) -> JSONResponse:
    error = cast(AppError, exc)
    return problem_response(error.status, error.code, error.title, error.detail)


async def _handle_http_error(_request: Request, exc: Exception) -> JSONResponse:
    error = cast(HTTPException, exc)
    status = error.status_code
    title = _status_phrase(status)
    detail = error.detail if isinstance(error.detail, str) and error.detail else title
    code = _FRAMEWORK_ERROR_CODES.get(status, "http_error")
    return problem_response(status, code, title, detail, headers=error.headers)


async def _handle_validation_error(_request: Request, exc: Exception) -> JSONResponse:
    error = cast(RequestValidationError, exc)
    issues = [
        {"loc": [str(part) for part in issue["loc"]], "msg": issue["msg"], "type": issue["type"]}
        for issue in error.errors()
    ]
    detail = "; ".join(f"{'.'.join(issue['loc'])}: {issue['msg']}" for issue in issues)
    return problem_response(
        422, "invalid_request", _status_phrase(422), detail or "Invalid request", errors=issues
    )


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return problem_response(
        500, "internal_error", _status_phrase(500), "Something went wrong. Please try again."
    )


def _status_phrase(status: int) -> str:
    try:
        return HTTPStatus(status).phrase
    except ValueError:
        return "Error"
