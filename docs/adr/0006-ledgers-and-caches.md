# ADR 0006: Ledgers as the source of truth, cached totals for reads

- Status: accepted
- Date: 2026-10-08

## Context
XP feeds total XP, daily XP (daily goal), weekly XP (leaderboard) and achievements. Gems change through
rewards and purchases. These numbers must stay consistent and be explainable.

## Decision
- **Ledgers are the source of truth:**
  - `xp_events` gets one row per award: the amount, the source, a UTC timestamp and the learner's local
    date;
  - `gem_transactions` gets one row per change, with a reason, an optional idempotency reference and
    the balance after the change.
- **Caches serve fast reads.** `user_stats.xp_total` and `user_stats.gems` are updated in the same
  transaction as the ledger insert, and a test asserts that cache = SUM(ledger).
- **Derived figures come from the ledger:** daily XP is aggregated into `daily_activity`, and weekly
  league XP is a sum over `xp_events.local_date` for the week.
- **Seeded rivals use the same ledger.** Their XP is materialised lazily into `xp_events` with
  `source='bot'`, so the leaderboard query is identical for real and seeded learners.

## Consequences
- Every number on screen can be traced to ledger rows.
- One-off rewards (goal chest, path chest, achievement level, league prize) cannot be paid twice, thanks
  to a partial unique index on `(user_id, reason, ref)`.
