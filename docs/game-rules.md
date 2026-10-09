# Game rules

All rules are pure functions in `backend/app/domain/`. They are evaluated against the server clock and
the learner's time zone (see [ADR 0004](adr/0004-injectable-clock-lazy-settlement.md)).

## XP

| Session | XP |
|---|---|
| Lesson | 10 + combo bonus |
| Practice | 10 + combo bonus, and +1 heart |
| Review of a completed skill | 5 |
| Legendary challenge | 40 |
| Timed practice | 1 per correct answer, at most 20 |

**Combo bonus:** `min(5, ceil(longest_run / ceil(exercise_count / 5)))`. Here `longest_run` is the
longest streak of first-try correct answers in the session.

## Hearts

- A learner has at most **10** hearts and starts with all of them.
- Each incorrect CHECK in a lesson or review costs one heart, including each wrong match in "Select the
  matching pairs".
- These never cost a heart:
  - SKIP: the exercise is re-queued instead;
  - an answer accepted as a typo;
  - practice and timed sessions.
- **Regeneration:** +1 heart every **5 hours**, computed lazily from an anchor timestamp.
- **Refill to full:**
  - 350 gems in the shop;
  - 450 gems from the out-of-hearts dialog during a lesson.
- **Practice to earn hearts:** a passed practice session gives +1 heart.
- **At 0 hearts:** a lesson pauses on the out-of-hearts dialog, which offers refill, practice or quit.
  Quitting fails the lesson: no XP and no progress.

## Lessons

- Every exercise must eventually be answered correctly.
- Wrong or skipped exercises are asked again at the end, marked "previous mistake".
- After the 4th exercise, and at 5 and 10 correct answers in a row, the mascot appears with a short
  message. These can be turned off with **Motivational messages**.

## Streak

- The first completed session of a **local day** extends the streak by one.
- Missed days first consume **streak freezes** (at most 2 held, 200 gems each).
- If a missed day can't be covered by a freeze, the streak resets.
- The longest streak is kept. Milestones at 7, 30, 50, 100 and 365 days get a special celebration.

## Daily goal

- **Options:** Basic 1, Casual 10, Regular 20 (default), Serious 30 and Intense 50 XP a day.
- Crossing the goal for the first time in a local day opens a chest worth **5 gems**.

## Path

- **Section 1** has three units. Each unit has:
  - four lesson skills of three lessons each;
  - a treasure chest node worth 10 gems, which can be opened once;
  - a unit review node.
- Nodes unlock strictly in order.
- The active node shows a progress ring (lessons completed out of total) and a START bubble.
- **Crowns:** a completed skill earns crown level 1. Passing its legendary challenge (100 gems to enter,
  at most 3 mistakes) earns crown level 2 and turns the node gold.

## Leagues

- **10 tiers:** Bronze, Silver, Gold, Sapphire, Ruby, Emerald, Amethyst, Pearl, Obsidian and Diamond.
- **Cohorts:** 30 learners: one sample learner and 29 seeded rivals. Each sample learner has a cohort of
  their own, with the same rivals.
- **The week** runs from Monday 00:00 to Monday 00:00 in the learner's time zone.
- **Ranking:** weekly XP, highest first. A tie goes to whoever reached that total first.
- **Promotion slots:** 20, 15, 10, 7, 7, 7, 7, 7, 5 and 0 (Bronze to Diamond).
- **Demotion:** the bottom 5 are demoted, except in Bronze.
- **Top 3** earn gems.
- **Rival XP** is generated deterministically per day and written to the same XP ledger.

## Achievements

Each level reached awards 25 gems.

| Achievement | Measures | Levels |
|---|---|---|
| Wildfire | best streak (days) | 3, 7, 14, 30, 50, 75, 125, 180, 250, 365 |
| Sage | total XP | 100, 250, 500, 1000, 2000, 4000, 7500, 12500, 20000, 30000 |
| Sharpshooter | lessons without mistakes | 1, 5, 20, 50, 100 |
| Champion | leaderboard unlocked, then league tiers reached | 10 levels |
| Overachiever | XP earned in one day | 50, 100, 200 |
| Legendary | skills passed at legendary level | 1, 5, 10, 25, 50 |
