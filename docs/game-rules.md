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
- Each incorrect CHECK in a lesson or a review (including a unit review) costs one heart, including
  each wrong match in "Select the matching pairs".
- These never cost a heart:
  - SKIP: the exercise is re-queued instead;
  - an answer accepted as a typo;
  - "Can't listen now" and the speaking exercise, which are set aside without a penalty;
  - practice, timed and legendary sessions.
- **Regeneration:** +1 heart every **5 hours**, computed lazily from an anchor timestamp. The clock
  starts when the first heart is lost and stops when hearts are full again.
- **Refill to full:**
  - 350 gems in the shop or from the hearts popover;
  - 450 gems from the out-of-hearts dialog during a lesson.
- **Practice to earn hearts:** a completed practice session gives +1 heart, up to the maximum.
- **At 0 hearts:** a lesson can't be started, and a lesson in progress pauses on the out-of-hearts
  dialog, which offers refill, practice or quit. Quitting fails the lesson: no XP and no progress.

## Lessons

- A lesson has 10 exercises and a unit review 15. Practice draws 10 exercises from completed lessons.
- Every exercise must eventually be answered correctly.
- Wrong or skipped exercises are asked again at the end, marked "previous mistake".
- **Grading** happens on the server. Answers are compared after lowercasing, dropping punctuation
  and collapsing spaces. A missing accent, or a single slip (one letter added, missing, changed or
  two swapped) when both texts are at least 5 characters long, counts as a typo: accepted, with the
  correct spelling shown.
- **Word hints:** the Spanish words of a sentence have a dotted underline; hovering, focusing or
  tapping one shows its meaning. Hints gloss single words and set phrases, never the whole sentence,
  and a word introduced by a "new word" exercise is marked as new.
- When the first previous mistake comes up, at 5 and 10 correct answers in a row, and once after the
  4th exercise, the owl appears with a short message. These can be turned off with **Motivational
  messages**.

## Streak

- The first completed session of a **local day** extends the streak by one.
- Missed days first consume **streak freezes** (at most 2 held, 200 gems each).
- If a missed day can't be covered by a freeze, the streak resets.
- The longest streak is kept. Milestones at 7, 30, 50, 100 and 365 days get a special celebration.

## Daily goal

- **Options:** Basic 1, Casual 10, Regular 20 (default), Serious 30 and Intense 50 XP a day.
- Crossing the goal for the first time in a local day opens a chest worth **5 gems**.

## Path

- **Section 1** has three units. Each unit has six nodes:
  - four lesson skills of three lessons each;
  - a treasure chest node (after the second skill) worth 10 gems, which can be opened once;
  - a unit review node.
- Nodes unlock strictly in order.
- The active node shows a progress ring (lessons completed out of total) and a START bubble.
- The first node of a locked unit offers "Jump here?"; skipping ahead is "Coming soon".
- **Crowns:** a completed skill earns crown level 1. Replaying it is a review (5 XP).
- **Legendary challenge:** on a completed lesson skill, for 100 gems: 15 exercises drawn from the
  skill, no hearts, at most 3 mistakes (the 4th fails the challenge). Passing earns crown level 2
  and turns the node gold.

## Timed practice

- 20 exercises drawn from completed lessons (multiple choice, picture choice, fill in the blank and
  word-bank translation).
- The timer starts at 30 seconds and each correct answer adds 7. The session ends when the timer
  runs out or the exercises do, and pays 1 XP per correct answer.

## Leagues

- **10 tiers:** Bronze, Silver, Gold, Sapphire, Ruby, Emerald, Amethyst, Pearl, Obsidian and Diamond.
- **Unlocking:** the leaderboard unlocks after 10 completed lessons (lessons, reviews and legendary
  challenges count).
- **Cohorts:** 30 learners per league per week. Learners in the same league and week share one cohort,
  topped up with simulated rivals, so they all see the same live table. A learner who needs a cohort
  (on unlocking the leaderboard, or in a new week) joins the open cohort for their league and week,
  taking the seat of the rival lowest in the table; a new cohort is formed only when none has a seat
  left. Learners promoted or demoted together therefore stay together.
- **Rivals** sit in at most one cohort per week. They are reused from week to week and new ones are
  created when more are needed.
- **The week** runs from Monday 00:00 to Monday 00:00 in the learner's time zone.
- **Ranking:** weekly XP, highest first. A tie goes to whoever reached that total first.
- **Promotion slots:** 20, 15, 10, 7, 7, 7, 7, 7, 5 and 0 (Bronze to Diamond).
- **Demotion:** the bottom 5 are demoted, except in Bronze.
- **Top 3** earn gems: from 20, 10 and 5 in Bronze up to 75, 60 and 50 in Diamond.
- **Live standings:** ranks are summed from the XP ledger on every read, so XP one learner earns shows
  on every other member's table straight away.
- **Rival XP** is generated deterministically per day and written to the same XP ledger; today's
  amount grows with the share of the day that has passed.
- **End of the week:** the first member to open the app after the week ends closes it for the whole
  cohort: final ranks, outcomes, prizes and next leagues for every learner in it, exactly once.

## Achievements

Each level reached awards 25 gems.

| Achievement | Measures | Levels |
|---|---|---|
| Wildfire | best streak (days) | 3, 7, 14, 30, 50, 75, 125, 180, 250, 365 |
| Sage | total XP | 100, 250, 500, 1000, 2000, 4000, 7500, 12500, 20000, 30000 |
| Sharpshooter | lessons without mistakes | 1, 5, 20, 50, 100 |
| Champion | leaderboard unlocked, then the highest league reached | 10 levels |
| Overachiever | XP earned in one day | 50, 100, 200 |
| Legendary | skills passed at legendary level | 1, 5, 10, 25, 50 |
