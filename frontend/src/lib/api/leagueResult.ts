import type { LeaderboardResponse } from "./types";

type LastResult = NonNullable<LeaderboardResponse["last_result"]>;

/**
 * The API reports last week's league result on the first read of the table after the week
 * closed, and only then. That read is often not the Leaderboards page: the right rail's league
 * card reads the table on every main page. So every read keeps the result here, per learner and
 * per league week, until the Leaderboards page has shown it.
 */
const KEY = "leaderboard:last-result";

interface Kept {
  week: string;
  result: LastResult;
}

function keyFor(board: LeaderboardResponse): string | null {
  const me = board.rows.find((row) => row.is_me);
  return me ? `${KEY}:${me.user_id}` : null;
}

/** Keeps the result a read of the table reported, for the week it was reported in. */
export function keepLeagueResult(board: LeaderboardResponse): void {
  const key = keyFor(board);
  if (!key || !board.last_result) return;
  const kept: Kept = { week: board.week_start, result: board.last_result };
  try {
    window.localStorage.setItem(key, JSON.stringify(kept));
  } catch {
    // Storage blocked: the result only shows if the Leaderboards page made the read itself.
  }
}

/** The result an earlier read of this week's table reported, if any. */
export function keptLeagueResult(board: LeaderboardResponse): LastResult | null {
  const key = keyFor(board);
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const kept = JSON.parse(raw) as Partial<Kept>;
    return kept.week === board.week_start && kept.result ? kept.result : null;
  } catch {
    return null;
  }
}
