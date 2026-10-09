# ADR 0003: A default learner behind a single auth seam

- Status: accepted
- Date: 2026-10-08

## Context
The assignment allows simplified authentication ("assume a default logged-in learner") but requires that
all progress persists per user.

## Decision
- **One seam.** A single FastAPI dependency, `get_current_user`, resolves the learner. Today it returns
  the seeded default learner.
- **Every learner query is scoped by `user_id`.** Integration tests override the dependency with a
  second user to prove that one learner never sees another's data.
- **No login form and no passwords.** Real authentication would replace only the dependency, for example
  a session cookie or an OAuth provider.
- **No rate limiting.** With a single demo learner and no credentials there is nothing to brute-force;
  this is revisited together with real authentication.

## Consequences
- **Shared demo state.** Everyone using the live demo shares the same learner, so Settings has
  "Reset demo data" and the README explains this.
- **Tables are already multi-user**, including the 29 seeded league rivals, so the leaderboard is real.
