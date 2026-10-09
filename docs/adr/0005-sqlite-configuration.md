# ADR 0005: SQLite configuration and migrations

- Status: accepted
- Date: 2026-10-08

## Context
The assignment mandates SQLite. It runs inside a single API process on a persistent disk.

## Decision
- **Pragmas on every connection:**
  - `foreign_keys=ON`
  - `journal_mode=WAL`, so readers do not block the writer
  - `busy_timeout=5000`
  - `synchronous=NORMAL`
- **State-changing transactions start with `BEGIN IMMEDIATE`.** Two concurrent requests from the same
  learner then serialise instead of failing with an upgrade deadlock.
- **One Uvicorn worker in production**, so there is a single writer process.
- **Schema rules:**
  - content tables use integer keys plus unique slugs;
  - timestamps are UTC ISO-8601 text written through a typed column, and local dates are `YYYY-MM-DD`;
  - enums are enforced with `CHECK` constraints and JSON columns with `json_valid`;
  - partial unique indexes make one-off rewards idempotent.
- **Alembic owns the schema:**
  - migrations run with `render_as_batch=True`, because SQLite can barely `ALTER`;
  - foreign keys are disabled for the duration of a migration;
  - deploys run `alembic upgrade head` before the server starts.

## Consequences
- Zero operational overhead. The database file is backed up through the host's disk snapshots, plus a
  `VACUUM INTO` copy before releases.
- Horizontal scaling would need a move to Postgres. The SQLAlchemy models and migrations are written so
  that change is mechanical.
