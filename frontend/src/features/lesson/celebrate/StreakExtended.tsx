import { Check, Flame, Snowflake } from "@/components/icons";
import type { CompletionResult, StreakDay } from "@/lib/api";
import { strings } from "@/content/strings";

import { cx } from "../cx";
import { lessonStrings } from "../strings";

function DayDot({ status }: { status: StreakDay["status"] }) {
  if (status === "extended") {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-orange text-surface">
        <Check size={20} />
      </span>
    );
  }
  if (status === "frozen") {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-selected-bg">
        <Snowflake size={20} />
      </span>
    );
  }
  return <span className="block size-8 rounded-full bg-locked-face" />;
}

/** This week's days: orange checks for practised days, blue snowflakes for frozen ones. */
export function WeekStrip({ week }: { week: StreakDay[] }) {
  if (week.length === 0) return null;
  return (
    <div className="w-full max-w-[400px] rounded-panel border-2 border-border px-4 py-3">
      <ol aria-label={lessonStrings.weekLabel} className="flex justify-between">
        {week.map((day) => (
          <li key={day.date} className="flex flex-col items-center gap-2">
            <span className="sr-only">
              {`${day.label}: ${strings.stats.streak.dayStatus[day.status]}`}
            </span>
            <span
              aria-hidden="true"
              className={cx("text-caps", day.status === "extended" ? "text-orange" : "text-muted")}
            >
              {day.label}
            </span>
            <span aria-hidden="true">
              <DayDot status={day.status} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Shown when this lesson extended the streak: flame, count, "day streak" and the week. */
export function StreakExtended({ streak }: { streak: CompletionResult["streak"] }) {
  return (
    <>
      <Flame size={140} className="h-auto w-[110px] animate-pop md:w-[140px]" />
      <div>
        <p className="text-[96px] leading-none font-extrabold text-orange tabular-nums md:text-[120px]">
          {streak.current}
        </p>
        <p className="mt-1 text-heading text-orange">{lessonStrings.dayStreak}</p>
      </div>
      <WeekStrip week={streak.week} />
      <p className="max-w-[400px] text-base text-muted">
        {streak.milestone
          ? lessonStrings.streakMilestone(streak.current)
          : lessonStrings.streakBody(streak.current)}
      </p>
    </>
  );
}
