"""Logging for the ``app`` package: one console handler, each line tagged with the request id."""

import logging
from contextvars import ContextVar

# Set by the request middleware; "-" outside a request (startup, scripts).
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s"


class RequestIdFilter(logging.Filter):
    """Copy the current request id onto every record so the format string can print it."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.__dict__["request_id"] = request_id_var.get()  # the same thing extra= does
        return True


def configure_logging(level: str) -> None:
    """Send ``app.*`` logs to stderr at ``level``. Calling it again replaces the handler."""
    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    app_logger = logging.getLogger("app")
    app_logger.handlers = [handler]
    app_logger.setLevel(level.upper())
    app_logger.propagate = False  # the server's own handlers would print each line twice
