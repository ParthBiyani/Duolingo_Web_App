"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useRef, useState, type KeyboardEvent, type RefObject, type UIEvent } from "react";

import { Close, DuoImage, type DuoAsset } from "@/components/icons";
import { cn, Modal, ModalClose, ModalDescription, ModalTitle } from "@/components/ui";
import { useStreakCalendar, type StreakCalendarResponse } from "@/lib/api";

import {
  goalProgress,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  type CalendarCell,
  type CalendarWeek,
} from "./calendar";
import { streakStrings as s } from "./strings";

/** The streak length that opens the Streak Society, as on the original. */
export const STREAK_SOCIETY_DAYS = 7;

type Tab = "personal" | "friends";

/** What the modal knows before the calendar loads: the streak from `/me`. */
export interface StreakSummary {
  current: number;
  extended_today: boolean;
}

export interface StreakModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streak: StreakSummary;
}

function heroMessage(streak: StreakSummary): string {
  if (streak.extended_today) return s.extended;
  return streak.current > 0 ? s.pending : s.start;
}

const heading = "text-[25px] leading-[34px] font-bold text-title";
const card = "rounded-2xl border-2 border-border";

// Calendar ---------------------------------------------------------------------

/** Column placement for one cell or band in a week's 7-column grid. */
const column = (start: number, end = start) => ({
  gridColumn: `${start + 1} / ${end + 2}`,
  gridRow: 1,
});

const CELL_STATUS: Record<CalendarCell["status"], string> = {
  extended: "bg-streak-day text-surface",
  frozen: "bg-blue text-surface",
  missed: "text-disabled",
  pending: "text-disabled",
  future: "text-disabled",
};

function Day({ cell, index }: { cell: CalendarCell; index: number }) {
  const label = s.dayStatus[cell.status];
  return (
    <div
      style={column(index)}
      className={cn(
        "relative grid size-[30px] place-items-center rounded-full text-[17px] leading-[13px] font-bold",
        CELL_STATUS[cell.status],
        cell.isToday && cell.status === "pending" && "ring-2 ring-border ring-inset",
      )}
    >
      <span aria-hidden="true">{cell.day}</span>
      <span className="sr-only">{`${s.weekdayNames[index]} ${cell.day}: ${label}`}</span>
    </div>
  );
}

function Week({ week }: { week: CalendarWeek }) {
  return (
    <li className="rounded-full border-2 border-transparent p-0.5">
      <div className="grid grid-cols-[repeat(7,30px)] items-center justify-between">
        {week.runs.map((run) => (
          <div
            key={run.start}
            aria-hidden="true"
            style={column(run.start, run.end)}
            className="h-7 rounded-full bg-gold/20 dark:bg-gold/10"
          />
        ))}
        {week.cells.map((cell, index) =>
          cell ? <Day key={cell.date} cell={cell} index={index} /> : null,
        )}
      </div>
    </li>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M8 1.5L2.5 7L8 12.5" : "M2 1.5L7.5 7L2 12.5"}
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MonthCalendar({
  data,
  onNavigate,
}: {
  data: StreakCalendarResponse;
  onNavigate: (month: string) => void;
}) {
  const weeks = monthGrid(data.month, data.days, data.today);
  const canGoBack = data.month > data.first_month;
  const canGoForward = data.month < monthOf(data.today);
  const navButton =
    "grid h-6 w-6 place-items-center rounded-md text-body transition-opacity hover:opacity-80 disabled:invisible";

  return (
    <div className={cn(card, "relative px-2 pt-4 pb-[23px]")}>
      <div className="absolute inset-x-[3px] top-[15px] flex justify-between">
        <button
          type="button"
          className={navButton}
          disabled={!canGoBack}
          aria-label={s.previousMonth}
          onClick={() => onNavigate(shiftMonth(data.month, -1))}
        >
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          className={navButton}
          disabled={!canGoForward}
          aria-label={s.nextMonth}
          onClick={() => onNavigate(shiftMonth(data.month, 1))}
        >
          <Chevron direction="right" />
        </button>
      </div>
      <div className="px-2">
        <h4
          aria-live="polite"
          className="pt-1 pb-4 text-center text-[17px] leading-[13px] font-bold text-body uppercase"
        >
          {monthLabel(data.month)}
        </h4>
        <div
          aria-hidden="true"
          className="grid grid-cols-[repeat(7,30px)] justify-between px-1 text-center text-[17px] leading-[30px] font-bold text-disabled"
        >
          {s.weekdays.map((letter, index) => (
            <span key={index}>{letter}</span>
          ))}
        </div>
        <ol className="mt-1.5 flex flex-col gap-1.5">
          {weeks.map((week) => (
            <Week key={week.cells.find(Boolean)?.date} week={week} />
          ))}
        </ol>
      </div>
    </div>
  );
}

// Streak goal ------------------------------------------------------------------

function GoalIcon({ name, value }: { name: DuoAsset; value: number }) {
  return (
    <div className="relative z-10 h-[39px] w-9 shrink-0">
      <DuoImage name={name} size={36} className="absolute bottom-0 left-0" />
      <span className="absolute inset-x-0 top-3.5 text-center text-[14px] leading-5 font-bold text-[#ff4b4b]">
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}

function StreakGoal({ current, goal }: { current: number; goal: StreakCalendarResponse["goal"] }) {
  const progress = goalProgress(current, goal.start, goal.target);
  return (
    <div className={cn(card, "p-4")}>
      <div
        role="progressbar"
        aria-label={s.goal}
        aria-valuemin={goal.start}
        aria-valuemax={goal.target}
        aria-valuenow={Math.min(current, goal.target)}
        aria-valuetext={s.goalProgress(current, goal.target)}
        className="flex h-[43px] items-start"
      >
        <GoalIcon name="streak-goal-start" value={goal.start} />
        <div className="relative mt-3 -ml-2 h-[18px] flex-1 overflow-hidden rounded-l-[9px] bg-border">
          <div
            className="relative h-full rounded-l-[9px] bg-unit-orange transition-[width] duration-500"
            style={{ width: `${progress * 100}%` }}
          >
            {progress > 0 ? (
              <div className="absolute inset-x-1 top-[5px] h-[3px] rounded-full bg-white opacity-20" />
            ) : null}
          </div>
        </div>
        <GoalIcon name="streak-goal-end" value={goal.target} />
      </div>
    </div>
  );
}

// Tabs -------------------------------------------------------------------------

function PersonalTab({
  streak,
  data,
  failed,
  onNavigate,
  heroRef,
}: {
  streak: StreakSummary;
  data: StreakCalendarResponse | undefined;
  failed: boolean;
  onNavigate: (month: string) => void;
  heroRef: RefObject<HTMLElement | null>;
}) {
  const extended = streak.extended_today;
  const member = streak.current >= STREAK_SOCIETY_DAYS;

  return (
    <>
      <section
        ref={heroRef}
        className={cn("p-6 transition-colors", extended ? "bg-streak-header" : "bg-raised")}
      >
        <div className="flex h-[112px] items-center justify-between gap-4">
          <h3
            className={cn(
              "text-[32px] leading-[34px] font-bold",
              extended ? "text-white" : "text-title",
            )}
          >
            {s.heroTitle(streak.current)}
          </h3>
          <div className="relative h-full w-[154px] shrink-0 max-[420px]:w-24">
            <DuoImage
              name="streak-calendar-flame"
              size={80}
              className={cn("absolute top-0 right-4", !extended && "grayscale")}
            />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-5 rounded-xl bg-surface p-5">
          <span className="grid size-10 shrink-0 place-items-center">
            <DuoImage name="streak-friends" size={32} />
          </span>
          <p className="text-[17px] leading-6 font-medium text-body">{heroMessage(streak)}</p>
        </div>
      </section>

      <section className="px-6 pt-6">
        <h3 className={heading}>{s.calendar}</h3>
        <div className="mt-2">
          {data ? (
            <MonthCalendar data={data} onNavigate={onNavigate} />
          ) : failed ? (
            <p className={cn(card, "p-5 text-center text-muted")}>{s.loadError}</p>
          ) : (
            <div className={cn(card, "h-[326px] animate-pulse bg-raised")} />
          )}
        </div>
      </section>

      <section className="px-6 pt-6">
        <h3 className={heading}>{s.goal}</h3>
        <div className="mt-2">
          {data ? (
            <StreakGoal current={streak.current} goal={data.goal} />
          ) : (
            <div className={cn(card, "h-[78px] animate-pulse bg-raised")} />
          )}
        </div>
      </section>

      <section className="p-6">
        <h3 className={heading}>{s.society}</h3>
        <div className={cn(card, "mt-3 flex items-center gap-6 bg-surface p-5")}>
          <DuoImage
            name={member ? "streak-calendar-flame" : "streak-society-locked"}
            size={member ? 60 : 69}
            className="ml-2 shrink-0"
          />
          <p className="text-[17px] leading-6 font-medium text-body">
            {member ? s.societyMember : s.societyLocked}
          </p>
        </div>
      </section>
    </>
  );
}

function FriendsTab() {
  return (
    <section className="p-6">
      <div className="flex h-[136px] items-center overflow-hidden rounded-2xl bg-friend-streak">
        <DuoImage name="friend-streaks" size={142} className="shrink-0 self-end" />
        <div className="min-w-0 flex-1 pr-5 text-white">
          <p className="leading-5 font-bold">{s.friendTitle}</p>
          <p className="mt-1 leading-6">{s.friendBody}</p>
        </div>
      </div>
      <p className="mt-6 text-center text-[17px] leading-6 font-medium text-muted">
        {s.friendSoon}
      </p>
    </section>
  );
}

const TABS: Tab[] = ["personal", "friends"];

// Modal ------------------------------------------------------------------------

function StreakModalBody({ streak }: { streak: StreakSummary }) {
  const [tab, setTab] = useState<Tab>("personal");
  const [month, setMonth] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ personal: null, friends: null });
  const calendar = useStreakCalendar(month, { placeholderData: keepPreviousData });

  // Once loaded, the calendar has the freshest streak; until then `/me` stands in.
  const summary: StreakSummary = calendar.data
    ? { current: calendar.data.current, extended_today: calendar.data.extended_today }
    : streak;
  // Like the original, the header wears the streak colour while the orange hero is under it.
  const orange = tab === "personal" && summary.extended_today && !scrolled;

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const heroHeight = heroRef.current?.offsetHeight ?? 0;
    setScrolled(event.currentTarget.scrollTop >= heroHeight);
  };

  const selectTab = (next: Tab) => {
    setTab(next);
    setScrolled(false);
  };

  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = tab === "personal" ? "friends" : "personal";
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <ModalClose asChild>
        <button
          type="button"
          aria-label={s.close}
          className="absolute top-4 left-5 z-20 grid size-8 place-items-center rounded-full bg-surface transition-[filter] hover:brightness-110"
        >
          <Close size={20} className="text-disabled" />
        </button>
      </ModalClose>
      <div
        className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
        onScroll={handleScroll}
      >
        <div
          className={cn(
            "sticky top-0 z-10 transition-colors duration-250",
            orange ? "bg-streak-header" : "bg-surface",
          )}
        >
          <ModalTitle
            className={cn(
              "px-10 pt-5 pb-2 text-[20px] leading-6 font-bold",
              orange ? "text-white" : "text-title",
            )}
          >
            {s.title}
          </ModalTitle>
          <div
            role="tablist"
            className={cn("flex border-b-2", orange ? "border-white" : "border-border")}
          >
            {TABS.map((name) => {
              const active = tab === name;
              return (
                <button
                  key={name}
                  ref={(node) => {
                    tabRefs.current[name] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`streak-tab-${name}`}
                  aria-selected={active}
                  aria-controls={`streak-panel-${name}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => selectTab(name)}
                  onKeyDown={handleTabKey}
                  className={cn(
                    "relative h-12 flex-1 p-4 text-[16px] leading-4 font-bold tracking-[0.04em] uppercase",
                    orange ? "text-white" : active ? "text-blue" : "text-title",
                  )}
                >
                  {s.tabs[name]}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-0 -bottom-0.5 h-1 rounded-[2px]",
                        orange ? "bg-white" : "bg-blue",
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div role="tabpanel" id={`streak-panel-${tab}`} aria-labelledby={`streak-tab-${tab}`}>
          {tab === "personal" ? (
            <PersonalTab
              streak={summary}
              data={calendar.data}
              failed={calendar.isError}
              onNavigate={setMonth}
              heroRef={heroRef}
            />
          ) : (
            <FriendsTab />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * The Streak modal opened from the streak popover's "View more": the streak, a month calendar
 * of streak days, the next streak goal and the Streak Society, plus a Friends tab. A 480px
 * card near the top of the screen; a full-screen sheet on phones.
 */
export function StreakModal({ open, onOpenChange, streak }: StreakModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "top-12 flex h-[min(calc(100dvh-6rem),1120px)] max-h-none w-[480px] -translate-x-1/2 translate-y-0 flex-col overflow-hidden rounded-2xl border-0 p-0",
        "max-sm:inset-0 max-sm:h-dvh max-sm:w-full max-sm:translate-x-0 max-sm:rounded-none",
      )}
    >
      <ModalDescription className="sr-only">{heroMessage(streak)}</ModalDescription>
      <StreakModalBody streak={streak} />
    </Modal>
  );
}
