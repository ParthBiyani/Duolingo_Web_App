"use client";

import { Clock } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { Button, Skeleton } from "@/components/ui";
import { useLeaderboard, type LeaderboardResponse } from "@/lib/api";
import { formatTimeLeft, useServerNow } from "@/lib/time";

import { LeaderboardLocked } from "./LeaderboardLocked";
import { LeaderboardRow } from "./LeaderboardRow";
import { LeagueBadgeStrip } from "./LeagueBadgeStrip";
import { LeagueResultModal } from "./LeagueResultModal";
import { leaderboardStrings } from "./strings";
import { ZoneDivider } from "./ZoneDivider";
import { withZoneDividers } from "./zones";

/**
 * How often the open table refreshes. Learners in the same league share one table, so this
 * brings in the XP other learners earn and the rivals' progress through the day.
 */
const LIVE_REFRESH_MS = 30_000;

/** Leaderboards page: this week's league table, or the locked state for new learners. */
export function LeaderboardScreen() {
  const board = useLeaderboard({ refetchInterval: LIVE_REFRESH_MS });

  if (board.isPending) return <LeaderboardSkeleton />;

  if (board.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Mascot pose="sad" size={140} />
        <h1 className="text-heading text-title">{leaderboardStrings.loadErrorTitle}</h1>
        <p className="text-muted">{leaderboardStrings.loadErrorBody}</p>
        <Button variant="secondary" loading={board.isFetching} onClick={() => void board.refetch()}>
          {leaderboardStrings.retry}
        </Button>
      </div>
    );
  }

  if (!board.data.unlocked) {
    return <LeaderboardLocked lessonsToUnlock={board.data.lessons_to_unlock} />;
  }

  return <LeagueTable board={board.data} />;
}

function LeagueTable({ board }: { board: LeaderboardResponse }) {
  const items = withZoneDividers(board.rows);
  const listId = "league-heading";

  return (
    <div className="mx-auto w-full max-w-[600px] pt-6 pb-16">
      <header className="flex flex-col items-center border-b-2 border-border pb-6 text-center">
        <LeagueBadgeStrip tiers={board.tiers} current={board.tier} />
        <h1 id={listId} className="mt-5 text-heading text-title">
          {leaderboardStrings.leagueTitle(board.name)}
        </h1>
        <p className="mt-2 text-muted">
          {board.promote_count > 0
            ? leaderboardStrings.advance(board.promote_count)
            : leaderboardStrings.topLeague}
        </p>
        <TimeLeft endsAt={board.ends_at} />
      </header>

      <ol aria-labelledby={listId} className="mt-4 flex flex-col">
        {items.map((item) =>
          item.kind === "row" ? (
            <LeaderboardRow key={item.row.user_id} row={item.row} />
          ) : (
            <ZoneDivider key={`divider-${item.zone}`} zone={item.zone} />
          ),
        )}
      </ol>

      <LeagueResultModal board={board} />
    </div>
  );
}

/** Live "3 days" style countdown to the end of the league week, on the server's clock. */
function TimeLeft({ endsAt }: { endsAt: string }) {
  const now = useServerNow();
  return (
    <p className="mt-3 flex items-center gap-2 font-bold text-orange">
      <Clock size={22} />
      <span className="sr-only">{leaderboardStrings.timeLeftLabel}: </span>
      {formatTimeLeft(Date.parse(endsAt) - now)}
    </p>
  );
}

function LeaderboardSkeleton() {
  return (
    <div
      role="status"
      aria-label={leaderboardStrings.loading}
      className="mx-auto w-full max-w-[600px] pt-6"
    >
      <div className="flex flex-col items-center gap-4 border-b-2 border-border pb-6">
        <div className="flex items-center gap-4">
          {[52, 52, 84, 52, 52].map((size, index) => (
            <Skeleton key={index} className="rounded-full" style={{ width: size, height: size }} />
          ))}
        </div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <ul aria-hidden="true" className="mt-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-5 w-6" />
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-16" />
          </li>
        ))}
      </ul>
    </div>
  );
}
