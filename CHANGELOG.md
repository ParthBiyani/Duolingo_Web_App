# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Streak details:** VIEW MORE in the streak popover opens a Streak window with a month calendar
  of streak and frozen days, the next streak goal and the Streak Society, backed by
  `GET /streak/calendar`.
- **Login:** a login page with four sample learners at different stages in a 2x2 grid, a signed
  `HttpOnly` session cookie (`duo_session`), log out, and a redirect to `/login` without a session.
  Sign-up and the email and password form are "Coming soon".
- **Shared leagues:** learners in the same league and week share one live cohort; the seed puts
  three sample learners in one Silver league.
- **Lesson:** word hints on Spanish sentences and a loading screen with the dancing owl while a
  session starts.
- **Path:** animated characters beside the path, still and grey in locked units, and a "Jump here?"
  offer on the first node of each locked unit.
- **Shell:** top bar popovers that open on hover, a right rail that varies by page, and a Shop banner
  that rotates between the family plan and a Super free trial.

### Changed
- **Hearts:** the limit is 10 instead of 5 (migration `0002_ten_hearts`), and learners start full.
- **Look:** Duolingo's own fonts (Duolingo Sans and Feather), icons, artwork and Lottie animations
  replace Nunito and most of the original drawings.
- **Hosting:** the live API runs on Render's free plan, so its data is reseeded after a redeploy or
  spin-down.

## [1.0.0] - 2026-10-09

### Added
- **Learning path:** units, sequentially unlocking nodes, progress rings, crowns, node popovers and
  treasure chests.
- **Top bar:** streak, total XP, gems and hearts, each with a popover; the XP popover shows today's
  progress towards the daily goal.
- **Lesson player:** multiple choice, picture choice, word-bank translation, match pairs, fill in the
  blank, typed answers and listening exercises. Includes server-side grading with typo tolerance, the
  feedback bar, combo counter and re-asked mistakes.
- **Hearts:** loss on mistakes, 5-hour regeneration, gem refills, practice to earn hearts and the
  out-of-hearts flow.
- **Streaks:** local-day logic, streak freezes, a week calendar and celebrations.
- **Daily goal:** goal selection, progress in the top bar, right rail and Quests, and a gem chest
  when the goal is reached.
- **Leagues:** weekly leagues with seeded rivals, promotion and demotion zones, and rewards.
- **Profile:** statistics and six achievements with levels.
- **Shop:** heart refills and streak freezes paid with mocked gems.
- **Settings:** preferences, dark mode, daily goal and demo tools that simulate time.
- **Bonus features:** text-to-speech, legendary challenges, timed practice in the Practice hub, dark
  mode and responsive layouts from 320px phones to wide monitors.
- **API:** REST API v1 with an OpenAPI schema and RFC 9457 error responses.
- **Database:** SQLite schema of 23 tables with Alembic migrations and an idempotent seed.
- **Quality:** CI for both apps: linting, type checks, unit and integration tests, and production builds.
