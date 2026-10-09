# ADR 0004: Injectable clock and lazy settlement

- Status: accepted
- Date: 2026-10-08

## Context
Streaks depend on calendar days in the learner's time zone, hearts regenerate every five hours, and
leagues roll over weekly. The assignment asks for this day logic to be simulated and testable.

## Decision
- **Rules are pure functions** of stored state, `now` and the learner's time zone. They live in
  `app/domain`.
- **A `Clock` dependency** provides `now`:
  - `SystemClock` in production;
  - `OffsetClock` (system time plus an offset persisted in `app_settings`) when `DEMO_TOOLS=true`;
  - `FixedClock` in tests.
- **Settlement is lazy and idempotent.** On every read or write that touches a learner, the service
  settles hearts regeneration, missed streak days (freezes, then a reset) and league finalisation. No
  cron jobs or background workers are needed.
- **Demo endpoints move the clock:** `POST /api/v1/demo/clock/advance` and `POST /api/v1/demo/reset`.
  The UI exposes them in a "Demo tools" section of Settings.
- **Responses include `server_now`**, so countdowns in the UI follow server time, not the browser clock.

## Consequences
- Tests can cover any calendar scenario (midnight in IST versus UTC, a missed day with a freeze, week
  rollover) deterministically.
- Evaluators can watch a streak grow or hearts refill in seconds.
