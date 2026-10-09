# ADR 0002: Server-authoritative grading and game state

- Status: accepted
- Date: 2026-10-08

## Context
Hearts, XP, streaks and gems must persist per user and must not be easy to fake from the browser.
A lesson also has to survive refreshes and double clicks.

## Decision
- **The server grades every answer.** Exercises are sent to the browser without their answers. Each
  CHECK calls `POST /sessions/{id}/answers`, and the server decides the outcome and changes hearts.
- **Match pairs are checked one pair at a time**, so a wrong match can cost a heart, as it does in the
  original.
- **Completion is validated on the server.** Every planned exercise must have a correct answer. XP,
  streak, daily goal, skill progress and achievements are then awarded in a single transaction.
- **Writes are idempotent:**
  - sessions use a client-generated UUID;
  - each answer carries an `answer_id`, protected by `UNIQUE(session_id, answer_id)`;
  - the completion summary is stored, so a repeated `complete` returns the same body.

## Consequences
- Each answer costs one small request. On a warm server this is well under the time the feedback bar
  animation takes.
- The browser can never award itself XP or skip heart loss.
