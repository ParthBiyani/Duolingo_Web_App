# Database schema

SQLite, 23 tables, created by Alembic migration `0001_initial`; `0002_ten_hearts` then raised the heart
limit from 5 to 10. The tables fall into five groups: course
**content**, **learners** and their state, lesson **sessions**, append-only **ledgers**, and the
gamification **catalogue**.

```mermaid
erDiagram
  courses ||--o{ units : "has"
  units ||--o{ skills : "path nodes"
  skills ||--o{ lessons : "has"
  lessons ||--o{ exercises : "has"
  exercises ||--o{ exercise_options : "offers"
  exercises ||--o{ exercise_answers : "accepts"
  courses |o--o{ users : "current course"
  users ||--|| user_settings : "has"
  users ||--|| user_stats : "has"
  leagues ||--o{ user_stats : "tier"
  users ||--o{ skill_progress : "tracks"
  skills ||--o{ skill_progress : "progress"
  users ||--o{ sessions : "plays"
  lessons |o--o{ sessions : "played in"
  skills |o--o{ sessions : "played in"
  sessions ||--o{ session_answers : "records"
  exercises ||--o{ session_answers : "answered"
  users ||--o{ xp_events : "earns"
  sessions |o--o| xp_events : "awards"
  users ||--o{ gem_transactions : "gem ledger"
  users ||--o{ daily_activity : "per day"
  leagues ||--o{ league_cohorts : "groups"
  league_cohorts ||--o{ league_memberships : "contains"
  users ||--o{ league_memberships : "joins"
  achievements ||--o{ user_achievements : "levels"
  users ||--o{ user_achievements : "unlocks"
  achievements {
    int id PK
    text key
    text name
    text description
    text metric
    text thresholds
    int gems_per_level
    text color
    int position
  }
  app_settings {
    text key PK
    text value
  }
  courses {
    int id PK
    text slug
    text learning_language
    text from_language
    text title
    bool is_available
  }
  leagues {
    int tier PK
    text name
    text color
    int promote_count
    int demote_count
    text reward_gems
  }
  shop_items {
    int id PK
    text key
    text name
    text description
    int price_gems
    int in_lesson_price_gems
    bool is_available
  }
  league_cohorts {
    int id PK
    int tier FK
    text week_start
    text finalized_at
  }
  units {
    int id PK
    int course_id FK
    int section
    int position
    text slug
    text title
    text description
    text color
  }
  users {
    int id PK
    text username
    text display_name
    text avatar_color
    text timezone
    bool is_bot
    int bot_pace_xp
    int current_course_id FK
    text created_at
  }
  daily_activity {
    int user_id PK, FK
    text local_date PK
    int xp
    int sessions_completed
    int goal_xp
    text goal_met_at
    text streak_status
  }
  gem_transactions {
    int id PK
    int user_id FK
    int delta
    text reason
    text ref
    int balance_after
    text created_at
  }
  league_memberships {
    int cohort_id PK, FK
    int user_id PK, FK
    text joined_at
    int final_rank
    text outcome
    bool result_seen
  }
  skills {
    int id PK
    int unit_id FK
    int position
    text slug
    text type
    text title
    text icon
    int chest_gems
  }
  user_achievements {
    int user_id PK, FK
    int achievement_id PK, FK
    int level
    int progress
    text updated_at
  }
  user_settings {
    int user_id PK, FK
    bool sound_effects
    bool animations
    bool motivational_messages
    bool listening_exercises
    text theme
    int daily_goal_xp
  }
  user_stats {
    int user_id PK, FK
    int xp_total
    int gems
    int hearts
    text hearts_anchor_at
    int streak_current
    int streak_longest
    text streak_last_date
    int streak_freezes
    int lessons_completed
    int perfect_lessons
    int legendary_skills
    int top3_finishes
    int league_tier FK
  }
  lessons {
    int id PK
    int skill_id FK
    int position
    text slug
  }
  skill_progress {
    int user_id PK, FK
    int skill_id PK, FK
    int lessons_completed
    int crown_level
    text completed_at
    text legendary_at
  }
  exercises {
    int id PK
    int lesson_id FK
    int position
    text type
    text prompt
    text source_text
    text source_lang
    text tts_text
    bool is_new_word
  }
  sessions {
    text id PK
    int user_id FK
    text kind
    int skill_id FK
    int lesson_id FK
    text status
    text plan
    int mistakes
    int hearts_lost
    text started_at
    text ended_at
    text result
  }
  exercise_answers {
    int id PK
    int exercise_id FK
    text text
    bool is_canonical
  }
  exercise_options {
    int id PK
    int exercise_id FK
    text role
    int position
    text text
    text image_key
    bool is_correct
    int pair_key
    int answer_position
  }
  session_answers {
    int id PK
    text session_id FK
    text answer_id
    int exercise_id FK
    text answer
    text outcome
    text answered_at
  }
  xp_events {
    int id PK
    int user_id FK
    text session_id FK
    text source
    int amount
    text occurred_at
    text local_date
  }
```

## Tables

| Group | Table | Purpose and key constraints |
|---|---|---|
| Content | `courses` | One row per language course. `is_available=0` rows show as "Coming soon". |
| | `units` | Ordered units in a section. `UNIQUE(course_id, position)`; colour enum. |
| | `skills` | Path nodes: `lesson`, `chest`, `practice` or `unit_review` (the seed uses all but `practice`). Ordered within a unit; a chest, and only a chest, has `chest_gems`. |
| | `lessons` | Ordered lessons of a skill (3 for lesson skills, 1 for a unit review). |
| | `exercises` | Ordered exercises with a type `CHECK` over the 8 types (`multiple_choice`, `image_choice`, `translate_word_bank`, `match_pairs`, `fill_blank`, `type_answer`, `listen_type`, `speak`), the prompt, source text and language, TTS text and the "new word" flag. Word hints are not stored; the API derives them from the course vocabulary. |
| | `exercise_options` | Choices (`is_correct`, `image_key` holding a picture card's emoji), word-bank tiles (`answer_position`, NULL for distractors) and match pairs (`pair_key`). |
| | `exercise_answers` | Accepted typed answers; the canonical answer is flagged. |
| Learners | `users` | The four sample learners plus league rivals (`is_bot`, `bot_pace_xp`), created as cohorts need them. Logging in looks a learner up by the unique `username`. Stores the time zone. |
| | `user_settings` | Sound, animations, motivational messages, listening exercises, theme, daily goal (`CHECK IN (1,10,20,30,50)`). |
| | `user_stats` | Current state: hearts (0–10, default 10) with the regeneration anchor (set exactly while hearts are below 10), streak, freezes (0–2), counters for lessons, perfect lessons, legendary skills and top-3 finishes, league tier, and cached `xp_total` and `gems`. |
| | `skill_progress` | Per learner and skill: lessons completed and crown level (0–2), with completed (or chest claimed) and legendary timestamps. |
| Sessions | `sessions` | One per lesson, practice, review, legendary or timed attempt. Client UUID key, kind, status, frozen exercise plan (JSON), mistakes and hearts lost, stored completion result (JSON). |
| | `session_answers` | Every graded answer. `UNIQUE(session_id, answer_id)` makes submissions replay-safe. |
| Ledgers | `xp_events` | Every XP award, with its local date. `UNIQUE(session_id)`; a partial unique index allows one rival row per day. |
| | `gem_transactions` | Every gem change, with its reason and balance after. A partial unique index `(user_id, reason, ref)` blocks double rewards. |
| | `daily_activity` | Per learner and local day: XP, sessions, the goal in force, the time the goal was met, the streak status (`extended` or `frozen`). |
| Catalogue | `leagues` | 10 tiers with promotion and demotion counts and top-3 rewards. |
| | `league_cohorts` / `league_memberships` | Weekly groups of 30 per league, shared by the learners in that league and topped up with rivals, with final rank and outcome once the week closes. |
| | `achievements` / `user_achievements` | Achievement definitions with thresholds, and each learner's level and progress. |
| | `shop_items` | Heart refill (with a separate in-lesson price), streak freeze, legendary entry, unlimited hearts (unavailable). |
| | `app_settings` | Key/value settings, used for the simulated clock offset. |

## Conventions

- Content tables use **integer primary keys plus a unique slug**, so re-seeding is stable. Sessions use
  **client-generated UUIDs**.
- **Timestamps** are UTC ISO-8601 text. **Local dates** are `YYYY-MM-DD` in the learner's time zone.
- **Enums** are enforced with `CHECK` constraints and **JSON columns** with `CHECK(json_valid(...))`.
- Every foreign key has an explicit `ON DELETE` rule: `CASCADE` for owned rows, `SET NULL` for
  references that may outlive their target.
- Every foreign key and every filter or sort column is indexed.
- `user_stats.xp_total` and `user_stats.gems` are caches of the ledgers. They are written in the same
  transaction and checked by tests. See [ADR 0006](adr/0006-ledgers-and-caches.md).
