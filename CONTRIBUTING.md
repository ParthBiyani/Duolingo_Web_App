# Contributing

## Workflow
- `main` is always deployable. Work happens on short-lived branches named `<type>/<scope>-<description>`,
  for example `feat/lesson-player`.
- Open a pull request using the template. CI must be green, and the template's checklist ticked,
  before merging.
- Keep pull requests focused on one milestone or concern.

## Commit messages
[Conventional Commits](https://www.conventionalcommits.org/), enforced by a `commit-msg` hook:

```
<type>(<scope>): <imperative summary, lowercase, no full stop>
```

- **Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.
- **Common scopes:** `backend`, `frontend`, `db`, `api`, `domain`, `seed`, `auth`, `path`, `lesson`,
  `gamification`, `profile`, `leaderboard`, `shop`, `quests`, `settings`, `ui`, `design`, `e2e`, `ci`,
  `deploy`, `docs`.

## Local setup
1. Follow "Getting started" in the [README](README.md).
2. Install the hooks once (file hygiene, ruff for the backend, and the commit message check):
   ```bash
   uv tool install pre-commit
   pre-commit install
   ```

## Checks
| App | Command |
|---|---|
| Backend | `uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest` |
| Frontend | `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build` |
| End to end | `npx playwright install chromium && npm run test:e2e` (in `frontend`) |

CI runs the backend and frontend checks on every pull request.

## Conventions
- **Backend:** rules belong in `app/domain` as pure functions that take `now` as a parameter.
  Services own transactions. Routers stay thin.
- **Frontend:**
  - colours, sizes and motion come from the design tokens in `globals.css`, never raw values;
  - user-facing strings live in a `strings.ts` next to the feature;
  - shared building blocks go in `components/ui`.
