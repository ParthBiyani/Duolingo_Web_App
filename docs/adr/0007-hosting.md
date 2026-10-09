# ADR 0007: Hosting on Vercel and Render with a persistent disk

- Status: accepted
- Date: 2026-10-08

## Context
- The demo must keep all learner progress.
- SQLite needs a durable disk, and serverless platforms provide only an ephemeral filesystem.
- Free tiers that sleep and lose their disk would reset progress and add cold starts.

## Decision
- **Frontend:** Vercel (Hobby), with the project root set to `frontend/` and region `sin1`.
- **API:** a Render Starter web service in Singapore, running the `backend/` Docker image with a 1 GB
  persistent disk mounted at `/var/data`.
- **Start command:** `alembic upgrade head`, then `python -m app.seed --if-empty`, then `uvicorn` with
  one worker. The health check is `/api/health`.
- **Routing:** the browser only calls the Vercel origin, and `next.config.ts` rewrites `/api/*` to the
  Render URL from `API_ORIGIN`.
- **Indexing:** the API answers with `Cache-Control: no-store`, and both apps send
  `X-Robots-Tag: noindex`.

## Consequences
- No cold starts, data survives deploys and restarts, and Render takes daily disk snapshots.
- It costs a few dollars a month during the evaluation window.
- A free fallback (PythonAnywhere with an ASGI-to-WSGI adapter) is documented in `docs/deployment.md`.
