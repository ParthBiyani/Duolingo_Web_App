# ADR 0001: Stack and monorepo layout

- Status: accepted
- Date: 2026-10-08

## Context
The assignment fixes the stack (Next.js with TypeScript, FastAPI, SQLite) and asks for a single public
repository containing `frontend/` and `backend/`, deployed as a working demo.

## Decision
- One repository with two independent applications:
  - `frontend/`: Next.js 16 (App Router), React 19, TypeScript in strict mode, Tailwind CSS v4.
  - `backend/`: FastAPI with SQLAlchemy 2 and Alembic, managed by `uv`.
- Shared conventions live at the root: `.editorconfig`, `.gitattributes`, pre-commit hooks and CI.
- There is no root `package.json`. Each app keeps its own lockfile, so the two toolchains never interfere.
- The browser talks to the API only through the Next.js rewrite of `/api/*`, which makes everything same-origin.

## Consequences
- Each app can be built, tested and deployed on its own (Vercel for the frontend, Render for the API).
- CI runs one job per app, plus a contract job that keeps the generated API types in sync.
