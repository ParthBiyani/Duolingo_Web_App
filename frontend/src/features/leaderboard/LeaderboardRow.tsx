import { Medal } from "@/components/icons";
import type { LeaderboardRow as Row, Zone } from "@/lib/api/types";
import { formatCount } from "@/lib/format";

import { leaderboardStrings } from "./strings";

const RANK_COLOR: Record<Zone, string> = {
  promotion: "text-green-shade",
  safe: "text-muted",
  demotion: "text-red-shade",
};

/** One learner in the league table: rank (medal for the podium), avatar, name and weekly XP. */
export function LeaderboardRow({ row }: { row: Row }) {
  const podium = row.rank <= 3 ? (row.rank as 1 | 2 | 3) : null;
  return (
    <li
      aria-current={row.is_me ? "true" : undefined}
      data-zone={row.zone}
      className={`flex items-center gap-3 rounded-card px-3 py-3 md:gap-4 md:px-4 ${row.is_me ? "bg-selected-bg" : ""}`}
    >
      <span className={`grid w-8 shrink-0 place-items-center font-bold ${RANK_COLOR[row.zone]}`}>
        {podium ? (
          <Medal place={podium} size={38} title={leaderboardStrings.rank(row.rank, row.zone)} />
        ) : (
          <>
            <span className="sr-only">{leaderboardStrings.rank(row.rank, row.zone)}</span>
            <span aria-hidden="true">{row.rank}</span>
          </>
        )}
      </span>
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-full text-xl font-bold text-white"
        style={{ backgroundColor: row.avatar_color }}
      >
        {initial(row.display_name)}
      </span>
      <span className="min-w-0 flex-1 truncate font-bold text-title">
        {row.display_name}
        {row.is_me ? <span className="sr-only"> {leaderboardStrings.you}</span> : null}
      </span>
      <span className="shrink-0 text-body">{leaderboardStrings.xp(formatCount(row.xp))}</span>
    </li>
  );
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
