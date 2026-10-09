"use client";

import { useState, useSyncExternalStore } from "react";

import { Gem, LeagueBadge } from "@/components/icons";
import { Button, Modal, ModalTitle } from "@/components/ui";
import type { LeaderboardResponse } from "@/lib/api/types";

import { leaderboardStrings } from "./strings";

const SEEN_KEY = "leaderboard:result-seen-week";
/** Snapshot used during server rendering and hydration, when storage cannot be read. */
const UNKNOWN = "\u0000unknown";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readSeenWeek(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function markSeen(week: string) {
  try {
    window.localStorage.setItem(SEEN_KEY, week);
  } catch {
    // Storage blocked: the modal may show again next visit, which is harmless.
  }
}

/**
 * Last week's outcome (promoted, stayed or demoted), shown once per league week. The week the
 * learner dismissed it is remembered in localStorage.
 */
export function LeagueResultModal({ board }: { board: LeaderboardResponse }) {
  const seenWeek = useSyncExternalStore(subscribe, readSeenWeek, () => UNKNOWN);
  const [dismissed, setDismissed] = useState(false);
  const result = board.last_result;

  if (!result || dismissed || seenWeek === UNKNOWN || seenWeek === board.week_start) return null;

  const league = board.tiers.find((tier) => tier.tier === result.tier_after);
  const leagueName = league?.name ?? board.name;
  const title = leaderboardStrings.result[result.outcome](leagueName);

  const close = () => {
    markSeen(board.week_start);
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
