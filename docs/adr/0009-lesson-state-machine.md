# ADR 0009: The lesson player as a reducer state machine

- Status: accepted
- Date: 2026-10-08

## Context
The lesson screen has many interacting states: answering, checking, feedback, interstitials, re-asked
mistakes, the out-of-hearts and quit modals, and a chain of celebration screens. Ad hoc component state
quickly becomes hard to reason about and to test.

## Decision
- **One reducer.** The player is a single pure `useReducer` state machine in
  `features/lesson/reducer.ts`.
  - It has explicit phases (`loading`, `answering`, `checking`, `feedback`, `interstitial`,
    `completing`, `celebrate`, `done`, and `failed` for a legendary challenge that used up its
    mistakes) and a separate `modal` field (`quit` or `outOfHearts`).
  - Events are typed: `CHECK`, `RESULT`, `SKIP`, `CONTINUE`, `MATCH_RESULT`, `QUIT_OPEN` and others.
- **Side effects stay in the player component.** API calls, sounds and navigation react to state
  changes, so the reducer itself never performs I/O.
- **One component per exercise type,** chosen through a registry. Every exercise component receives the
  same props: the exercise, the current draft answer, a change handler, a lock flag and the last result,
  plus the match-pairs board state and a handler for "Can't listen now" / "Can't speak now".
- **Timed practice runs on the same reducer.** A `TICK` event drains the timer, and each correct
  answer adds time.

## Consequences
- Every transition is unit-tested without rendering: re-queued mistakes, combo milestones and the
  out-of-hearts path.
- A new exercise type means one component plus one registry entry.
