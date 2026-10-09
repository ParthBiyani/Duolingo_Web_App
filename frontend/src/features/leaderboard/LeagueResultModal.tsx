"use client";

import { useState, useSyncExternalStore } from "react";

import { Gem, LeagueBadge } from "@/components/icons";
import { Button, Modal, ModalTitle } from "@/components/ui";
import { keptLeagueResult } from "@/lib/api/leagueResult";
import type { LeaderboardResponse } from "@/lib/api/types";

import { leaderboardStrings } from "./strings";

const SEEN_KEY = "leaderboard:result-seen-week";
/** Snapshot used during server rendering and hydration, when storage cannot be read. */
const UNKNOWN = "\u0000unknown";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** One key per learner: learners in the same league finish the same week on one device. */
function seenKey(board: LeaderboardResponse): string {
  const me = board.rows.find((row) => row.is_me);
  return me ? `${SEEN_KEY}:${me.user_id}` : SEEN_KEY;
}

function readSeenWeek(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function markSeen(key: string, week: string) {
  try {
    window.localStorage.setItem(key, week);
  } catch {
    // Storage blocked: the modal may show again next visit, which is harmless.
  }
}

/**
 * Last week's outcome (promoted, stayed or demoted), shown once per league week. The week the
 * learner dismissed it is remembered in localStorage.
 */
export function LeagueResultModal({ board }: { board: LeaderboardResponse }) {
  const key = seenKey(board);
  const seenWeek = useSyncExternalStore(
    subscribe,
    () => readSeenWeek(key),
    () => UNKNOWN,
  );
  const [dismissed, setDismissed] = useState(false);
  // The API reports a result once, so the live refresh of the table clears it; keep the first.
  const [firstResult] = useState(board.last_result);
  if (dismissed || seenWeek === UNKNOWN || seenWeek === board.week_start) return null;
  // A read made elsewhere (the right rail's league card) may have taken the report: use the
  // copy every read keeps for this week.
  const result = board.last_result ?? firstResult ?? keptLeagueResult(board);
  if (!result) return null;

  const league = board.tiers.find((tier) => tier.tier === result.tier_after);
  const leagueName = league?.name ?? board.name;
  const title = leaderboardStrings.result[result.outcome](leagueName);

  const close = () => {
    markSeen(key, board.week_start);
    setDismissed(true);
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <LeagueBadge tier={league?.tier ?? 0} size={120} />
        <ModalTitle>{title}</ModalTitle>
        <p className="text-muted">
          {leaderboardStrings.result.rank(result.rank)} {leaderboardStrings.result.keepGoing}
        </p>
        {result.gems > 0 ? (
          <p className="flex items-center gap-2 font-bold text-title">
            <Gem size={24} />
            {leaderboardStrings.result.gems(result.gems)}
          </p>
        ) : null}
        <Button variant="primary" size="lg" fullWidth onClick={close} className="mt-2">
          {leaderboardStrings.result.cta}
        </Button>
      </div>
    </Modal>
  );
}
