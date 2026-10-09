# ADR 0007: Hosting on Vercel and Render

- Status: accepted
- Date: 2026-10-08

## Context
- SQLite needs a durable disk to keep learner progress, and serverless platforms provide only an
  ephemeral filesystem.
- Hosts that sleep or lose their filesystem would reset progress and add cold starts.

## Decision
- **Frontend:** Vercel (Hobby), with the project root set to `frontend/` and region `sin1`.
- **API:** a Render web service in Singapore on a paid instance with a 1 GB persistent disk mounted
  at `/var/data`, running the `backend/` Docker image with `DATABASE_URL=sqlite:////var/data/app.db`.
- **Start command:** `alembic upgrade head`, then `python -m app.seed --if-empty`, then `uvicorn` with
  one worker. The health check is `/api/health`.
- **Routing:** the browser only calls the Vercel origin, and `next.config.ts` rewrites `/api/*` to the
  Render URL from `API_ORIGIN`.
- **Indexing:** the API answers with `Cache-Control: no-store`, and both apps send
  `X-Robots-Tag: noindex, nofollow`.

## Consequences
- Progress survives deploys and restarts, the service never sleeps, and Render snapshots the disk
  daily. Set-up and backups are described in `docs/deployment.md`.
- One instance with one worker: SQLite on a single disk does not scale horizontally (see
  [ADR 0005](0005-sqlite-configuration.md)).
