FROM python:3.13-slim

# uv is copied from its official image; pin the version for reproducible builds.
COPY --from=ghcr.io/astral-sh/uv:0.12.23 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Install dependencies first so this layer is cached between code changes.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-install-project

COPY . .
RUN uv sync --locked --no-dev

EXPOSE 8000

# Migrate, seed once (no-op when content exists), then serve with a single writer process.
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed --if-empty && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
