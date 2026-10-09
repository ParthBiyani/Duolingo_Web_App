# ADR 0007: Hosting on Vercel and Render

- Status: accepted (revised 2026-10-09: the live demo runs on Render's free plan, without a
  persistent disk)
- Date: 2026-10-08

## Context
- SQLite needs a durable disk to keep learner progress, and serverless platforms provide only an
  ephemeral filesystem.
- Free tiers that sleep and lose their filesystem reset progress and add cold starts.
- The live demo has to cost nothing to keep running.

## Decision
- **Frontend:** Vercel (Hobby), with the project root set to `frontend/` and region `sin1`.
- **API:** a Render web service in Singapore on the free instance type, running the `backend/`
  Docker image. The SQLite file lives on the instance's own filesystem.
- **Start command:** `alembic upgrade head`, then `python -m app.seed --if-empty`, then `uvicorn` with
  one worker. The health check is `/api/health`.
- **Routing:** the browser only calls the Vercel origin, and `next.config.ts` rewrites `/api/*` to the
  Render URL from `API_ORIGIN`.
- **Indexing:** the API answers with `Cache-Control: no-store`, and both apps send
  `X-Robots-Tag: noindex, nofollow`.

## Consequences
- Hosting is free, but the demo's data is not permanent: a redeploy, a restart or a spin-down after
  about 15 idle minutes replaces the instance, and the start command reseeds the four sample learners
  in their starting state. The first request after a spin-down waits for a cold start.
- Persistence needs only configuration, not code: a paid instance with a 1 GB disk mounted at
  `/var/data` and `DATABASE_URL=sqlite:////var/data/app.db`. Data then survives deploys and restarts,
  there are no cold starts, and Render takes daily disk snapshots. Both set-ups are described in
  `docs/deployment.md`, with a free alternative that keeps its files (PythonAnywhere with an
  ASGI-to-WSGI adapter).
