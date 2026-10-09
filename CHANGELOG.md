# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

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
