# ADR 0003: Sample learners behind a single auth seam

- Status: accepted (revised 2026-10-09: a login page with four sample learners replaced the single
  default learner)
- Date: 2026-10-08

## Context
Authentication can be simplified (a default logged-in learner is enough), but all progress must
persist per user. One default learner made it hard to show the app at different stages
(a brand-new learner, a locked leaderboard, a long streak, a high league), so the seed now creates four
sample learners and the app needs a way to choose between them.

## Decision
- **One seam.** A single FastAPI dependency, `get_current_user`, resolves the learner. It reads the
  `duo_session` cookie and answers `401` with the code `not_authenticated` when the cookie is missing,
  forged or names no learner. Every route that reads or changes a learner's data depends on it;
  nothing else decides who the learner is. Only the auth routes, the demo tools (`/api/v1/demo/*`,
  which act on the whole demo rather than one learner) and the health check work without it.
- **Log in by picking a sample learner.** `GET /api/v1/auth/learners` lists the learners (public, for the
  login page), `POST /api/v1/auth/login {username}` sets the cookie for an existing non-rival user and
  `POST /api/v1/auth/logout` clears it. The login form for an email and password and sign-up are shown
  but answer "Coming soon".
- **A signed cookie, no session table.** The cookie holds `<username>.<signature>`, the signature being
  an HMAC-SHA256 of the username under the `SECRET_KEY` setting (a development value by default; set a
  real one when deployed). It is `HttpOnly`, `SameSite=Lax`, `Secure` in production and lasts 30 days.
  Because it names the learner by username, a demo reset that recreates the learners keeps everyone
  logged in. The frontend proxies `/api` through its own origin, so the cookie is first-party, and its
  proxy (`src/proxy.ts`) sends visitors without the cookie to `/login`.
- **Every learner query is scoped by `user_id`.** Integration tests log two clients in as different
  learners to prove that one learner never sees another's data.
- **No passwords and no rate limiting.** Anyone may log in as any sample learner, so there is nothing to
  brute-force; real authentication (passwords or OAuth) would replace only the login route and the
  contents of the cookie, and bring rate limiting with it.

## Consequences
- **Shared demo state per learner.** Everyone who picks the same learner on the live demo shares their
  progress, so Settings has "Reset demo data" and the README explains this.
- **Learners in the same league share a cohort.** The seed puts Parth, Isha and Kabir in one Silver
  cohort with 27 rivals, so the leaderboard is the same live table whoever is logged in. Finalising a
  week therefore settles every learner in the cohort at once (see `app/services/leagues.py`).
- **Rotating `SECRET_KEY` logs everyone out**, which is the intended way to invalidate sessions.
