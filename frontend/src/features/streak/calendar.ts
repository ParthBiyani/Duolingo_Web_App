/**
 * Pure helpers for the Streak modal: the month grid with its streak bands, month navigation
 * and streak goal progress. Months are `YYYY-MM` strings and days `YYYY-MM-DD` local dates,
 * so plain string comparison orders them.
 */
import type { StreakCalendarResponse } from "@/lib/api";

export type DayStatus = StreakCalendarResponse["days"][number]["status"];

export interface CalendarCell {
  /** Day of the month, from 1. */
  day: number;
  date: string;
  status: DayStatus;
  isToday: boolean;
}

/** A run of consecutive streak days within one week, as column indexes (0 = Monday). */
export interface StreakRun {
  start: number;
  end: number;
}

export interface CalendarWeek {
  /** Monday to Sunday; `null` pads the days outside the month. */
  cells: (CalendarCell | null)[];
  /** Runs of two or more streak days, drawn as a band joining their circles. */
  runs: StreakRun[];
}

/** Days that count towards the streak: practised or covered by a streak freeze. */
export const isStreakDay = (status: DayStatus) => status === "extended" || status === "frozen";

function parseMonth(month: string): { year: number; index: number } {
  const [year, number] = month.split("-").map(Number);
  return { year, index: number - 1 };
}

/** Monday-first weekday (0 = Monday) of the first day of `month`. */
function firstWeekday(month: string): number {
  const { year, index } = parseMonth(month);
  return (new Date(Date.UTC(year, index, 1)).getUTCDay() + 6) % 7;
}

function runsOf(cells: (CalendarCell | null)[]): StreakRun[] {
  const runs: StreakRun[] = [];
  let start = -1;
  cells.forEach((cell, column) => {
    const inRun = cell !== null && isStreakDay(cell.status);
    if (inRun && start < 0) start = column;
    const closes = start >= 0 && (!inRun || column === cells.length - 1);
    if (!closes) return;
    const end = inRun ? column : column - 1;
    if (end > start) runs.push({ start, end });
    start = -1;
  });
  return runs;
}

/** The month laid out in Monday-to-Sunday weeks, with the streak runs of each week. */
export function monthGrid(
  month: string,
  days: StreakCalendarResponse["days"],
  today: string,
): CalendarWeek[] {
  const cells: (CalendarCell | null)[] = Array.from({ length: firstWeekday(month) }, () => null);
  for (const { date, status } of days) {
    cells.push({ day: Number(date.slice(8, 10)), date, status, isToday: date === today });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarWeek[] = [];
  for (let offset = 0; offset < cells.length; offset += 7) {
    const week = cells.slice(offset, offset + 7);
    weeks.push({ cells: week, runs: runsOf(week) });
  }
  return weeks;
}

/** The month `delta` months after `month` (before it when negative). */
export function shiftMonth(month: string, delta: number): string {
  const { year, index } = parseMonth(month);
  const shifted = new Date(Date.UTC(year, index + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "October 2026". */
export function monthLabel(month: string): string {
  const { year, index } = parseMonth(month);
  return new Date(Date.UTC(year, index, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The `YYYY-MM` month a `YYYY-MM-DD` date falls in. */
export const monthOf = (date: string) => date.slice(0, 7);

/** How far the streak has come from the last goal to the next one, from 0 to 1. */
export function goalProgress(current: number, start: number, target: number): number {
  if (target <= start) return 1;
  return Math.min(1, Math.max(0, (current - start) / (target - start)));
}
