/**
 * Time-zone maths for the "Next Monday" demo button: how far to move the simulated clock so
 * the learner's local week rolls over (leagues reset at Monday 00:00 local time).
 */

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 1 = Monday ... 7 = Sunday
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    hour: Number(read("hour")),
    minute: Number(read("minute")),
    second: Number(read("second")),
    weekday: WEEKDAYS[read("weekday")] ?? 1,
  };
}

/** How far `timeZone` is ahead of UTC at `instant`, in milliseconds (IST is +19,800,000). */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const p = zonedParts(new Date(instant), timeZone);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallClockAsUtc - Math.floor(instant / 1000) * 1000;
}

/** UTC instant of 00:00 local time on a calendar date (day may overflow; Date.UTC normalises). */
function zonedMidnight(year: number, month: number, day: number, timeZone: string): number {
  const wallClock = Date.UTC(year, month - 1, day);
  // A second pass corrects the offset when a daylight-saving change sits between the guesses.
  const firstGuess = wallClock - zoneOffsetMs(wallClock, timeZone);
  return wallClock - zoneOffsetMs(firstGuess, timeZone);
}

/**
 * Whole seconds from `now` until the next Monday 00:00 in `timeZone`, plus a small margin so
 * the clock lands just after the boundary. On a Monday it targets the following Monday.
 */
export function secondsUntilNextMonday(now: Date, timeZone: string, marginSeconds = 5): number {
  const local = zonedParts(now, timeZone);
  const daysAhead = 8 - local.weekday;
  const target = zonedMidnight(local.year, local.month, local.day + daysAhead, timeZone);
  return Math.ceil((target - now.getTime()) / 1000) + marginSeconds;
}
