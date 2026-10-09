"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  Bolt,
  Check,
  Dumbbell,
  FlagES,
  Flame,
  Gem,
  Heart,
  HeartEmpty,
  Snowflake,
} from "@/components/icons";
import {
  Button,
  buttonClassName,
  cn,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  ProgressBar,
  toast,
} from "@/components/ui";
import { strings } from "@/content/strings";
import { isApiError, useRefillHearts, useShop, type MeResponse, type StreakDay } from "@/lib/api";
import { formatCountdown, useServerNow } from "@/lib/time";

import { SETTINGS_HREF } from "./nav-items";

type Stats = MeResponse["stats"];

/** Shop price used until the catalogue has loaded (plan: 350 gems in the shop). */
const FALLBACK_REFILL_PRICE = 350;

const formatNumber = (value: number) => value.toLocaleString("en-US");

const showComingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

/** A stat in the top bar; spacing tightens on the narrowest phones so all five fit. */
function StatTrigger({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <PopoverTrigger
      aria-label={label}
      className={cn(
        "flex h-11 items-center gap-1 rounded-xl px-1 text-base font-bold transition-colors hover:bg-surface-hover data-[state=open]:bg-surface-hover min-[400px]:gap-2 min-[400px]:px-2",
        className,
      )}
    >
      {children}
    </PopoverTrigger>
  );
}

// Course -----------------------------------------------------------------------

export function CoursePopover({ course }: { course: MeResponse["course"] }) {
  return (
    <Popover>
      <StatTrigger label={strings.stats.course.trigger(course.title)}>
        <FlagES size={32} className="rounded-md" />
      </StatTrigger>
      <PopoverContent className="w-72">
        <h2 className="text-caps text-muted uppercase">{strings.stats.course.heading}</h2>
        <div className="mt-3 flex items-center gap-3 rounded-xl border-2 border-selected-border bg-selected-bg p-3">
          <FlagES size={36} className="rounded-md" />
          <span className="font-bold text-title">{course.title}</span>
        </div>
        <button
          type="button"
          onClick={showComingSoon}
          className="mt-2 flex w-full items-center gap-3 rounded-xl p-3 text-left font-bold text-muted transition-colors hover:bg-surface-hover"
        >
          <span
            aria-hidden="true"
            className="grid h-7 w-9 place-items-center rounded-md border-2 border-dashed text-lead"
          >
            +
          </span>
          {strings.stats.course.addCourse}
        </button>
      </PopoverContent>
    </Popover>
  );
}

// Streak -----------------------------------------------------------------------

const DAY_CIRCLE: Record<StreakDay["status"], string> = {
  extended: "bg-orange text-white",
  frozen: "border-2 border-selected-border bg-selected-bg",
  missed: "bg-locked-face",
  pending: "border-2 border-dashed border-orange",
  future: "bg-raised",
};

function weekdayName(date: string): string {
  // Local dates are YYYY-MM-DD; parsing at local midnight keeps the weekday right.
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function WeekStrip({ week }: { week: StreakDay[] }) {
  return (
    <ol className="grid grid-cols-7 gap-1 text-center">
      {week.map((day) => (
        <li key={day.date} className="flex flex-col items-center gap-1.5">
          <span aria-hidden="true" className="text-caps text-muted">
            {day.label}
          </span>
          <span
            className={cn("grid size-8 place-items-center rounded-full", DAY_CIRCLE[day.status])}
          >
            {day.status === "extended" ? <Check size={16} /> : null}
            {day.status === "frozen" ? <Snowflake size={16} /> : null}
          </span>
          <span className="sr-only">
            {weekdayName(day.date)}: {strings.stats.streak.dayStatus[day.status]}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function StreakPopover({ streak }: { streak: Stats["streak"] }) {
  const extended = streak.extended_today;
  const message = extended
    ? strings.stats.streak.extended
    : streak.current > 0
      ? strings.stats.streak.pending
      : strings.stats.streak.start;

  return (
    <Popover>
      <StatTrigger
        label={strings.stats.streak.trigger(streak.current)}
        className={extended ? "text-orange" : "text-disabled"}
      >
        <Flame size={28} muted={!extended} />
        {formatNumber(streak.current)}
      </StatTrigger>
      <PopoverContent className="w-90 p-5">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h2 className={cn("text-heading", extended ? "text-orange" : "text-title")}>
              {strings.stats.streak.title(streak.current)}
            </h2>
            <p className="mt-1 text-muted">{message}</p>
          </div>
          <Flame size={56} muted={!extended} />
        </div>
        {streak.week.length > 0 ? (
          <div className="mt-4 rounded-xl border-2 p-3">
            <WeekStrip week={streak.week} />
          </div>
        ) : null}
        {streak.freezes > 0 ? (
          <p className="mt-4 flex items-center gap-2 font-bold text-muted">
            <Snowflake size={20} />
            {strings.stats.streak.freezes(streak.freezes)}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

// XP ---------------------------------------------------------------------------

/** Total XP, with today's progress towards the daily goal in the popover. */
export function XpPopover({ stats }: { stats: Stats }) {
  const goal = stats.daily_goal_xp;
  const reached = stats.today_xp >= goal;

  return (
    <Popover>
      <StatTrigger label={strings.stats.xp.trigger(stats.xp_total)} className="text-gold-shade">
        <Bolt size={28} />
        {formatNumber(stats.xp_total)}
      </StatTrigger>
      <PopoverContent className="w-80 p-5">
        <div className="flex items-center gap-4">
          <Bolt size={56} />
          <div className="min-w-0">
            <h2 className="text-heading text-title">{strings.stats.xp.title(stats.xp_total)}</h2>
            <p className="mt-1 text-muted">{strings.stats.xp.total}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border-2 p-4">
          <h3 className="text-caps text-muted uppercase">{strings.stats.xp.dailyGoal}</h3>
          <ProgressBar
            value={goal > 0 ? stats.today_xp / goal : 0}
            color="gold"
            className="mt-3 h-5"
            label={strings.stats.xp.progress(stats.today_xp, goal)}
            aria-label={strings.stats.xp.progressLabel(stats.today_xp, goal)}
          />
          <p className="mt-3 text-muted">
            {reached ? strings.stats.xp.reached : strings.stats.xp.remaining(goal - stats.today_xp)}
          </p>
        </div>
        <PopoverClose asChild>
          <Link
            href={SETTINGS_HREF}
            className={buttonClassName({
              variant: "secondary",
              fullWidth: true,
              className: "mt-5",
            })}
          >
            {strings.stats.xp.changeGoal}
          </Link>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

// Gems -------------------------------------------------------------------------

export function GemsPopover({ gems }: { gems: number }) {
  return (
    <Popover>
      <StatTrigger label={strings.stats.gems.trigger(gems)} className="text-blue">
        <Gem size={28} />
        {formatNumber(gems)}
      </StatTrigger>
      <PopoverContent className="w-80 p-5">
        <div className="flex items-center gap-4">
          <Gem size={56} />
          <div className="min-w-0">
            <h2 className="text-heading text-title">{strings.stats.gems.title}</h2>
            <p className="mt-1 text-muted">{strings.stats.gems.balance(gems)}</p>
          </div>
        </div>
        <PopoverClose asChild>
          <Link
            href="/shop"
            className={buttonClassName({
              variant: "secondary",
              fullWidth: true,
              className: "mt-5",
            })}
          >
            {strings.stats.gems.shop}
          </Link>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

// Hearts -----------------------------------------------------------------------

function NextHeartCountdown({ at }: { at: string }) {
  const now = useServerNow();
  return (
    <span className="font-bold text-title tabular-nums">
      {formatCountdown(Date.parse(at) - now)}
    </span>
  );
}

const rowButton = "justify-between gap-3 px-4";

function HeartsPanel({ stats }: { stats: Stats }) {
  const refill = useRefillHearts();
  const shop = useShop();
  const price =
    shop.data?.items.find((item) => item.key === "heart_refill")?.price_gems ??
    FALLBACK_REFILL_PRICE;
  const full = stats.hearts >= stats.hearts_max;
  const affordable = stats.gems >= price;

  const handleRefill = () =>
    refill.mutate("shop", {
      onSuccess: () => toast.success(strings.stats.hearts.refilled, { id: "hearts" }),
      onError: (error) => {
        if (isApiError(error, "insufficient_gems")) toast.error(strings.stats.hearts.notEnoughGems);
        else if (isApiError(error, "hearts_full")) toast(strings.stats.hearts.alreadyFull);
      },
    });

  return (
    <>
      <h2 className="text-center text-heading text-title">{strings.stats.hearts.title}</h2>
      <div className="mt-4 flex justify-center gap-1.5">
        {Array.from({ length: stats.hearts_max }, (_, index) =>
          index < stats.hearts ? (
            <Heart key={index} size={36} />
          ) : (
            <HeartEmpty key={index} size={36} />
          ),
        )}
      </div>
      <p className="mt-3 text-center text-muted" aria-live="polite">
        {full ? (
          <>
            <span className="font-bold text-title">{strings.stats.hearts.full}</span>
            <br />
            {strings.stats.hearts.fullHint}
          </>
        ) : stats.next_heart_at ? (
          <>
            {strings.stats.hearts.nextHeart} <NextHeartCountdown at={stats.next_heart_at} />
          </>
        ) : (
          strings.stats.hearts.empty
        )}
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <Button variant="outline" fullWidth className={rowButton} onClick={showComingSoon}>
          <span className="flex items-center gap-3">
            <Heart size={24} />
            {strings.stats.hearts.unlimited}
          </span>
          <span className="rounded-md bg-purple px-2 py-0.5 text-caps text-white">
            {strings.rail.super.badge}
          </span>
        </Button>
        <Button
          variant="outline"
          fullWidth
          className={rowButton}
          disabled={full || !affordable}
          loading={refill.isPending}
          onClick={handleRefill}
        >
          <span className="flex items-center gap-3">
            <Heart size={24} />
            {strings.stats.hearts.refill}
          </span>
          <span className="flex items-center gap-1.5">
            <Gem size={20} />
            {formatNumber(price)}
          </span>
        </Button>
        <PopoverClose asChild>
          <Link
            href="/practice"
            className={buttonClassName({
              variant: "outline",
              fullWidth: true,
              className: rowButton,
            })}
          >
            <span className="flex items-center gap-3">
              <Dumbbell size={24} />
              {strings.stats.hearts.practice}
            </span>
          </Link>
        </PopoverClose>
      </div>
    </>
  );
}

export function HeartsPopover({ stats }: { stats: Stats }) {
  const empty = stats.hearts === 0;
  return (
    <Popover>
      <StatTrigger
        label={strings.stats.hearts.trigger(stats.hearts)}
        className={empty ? "text-disabled" : "text-red"}
      >
        {empty ? <HeartEmpty size={28} /> : <Heart size={28} />}
        {stats.hearts}
      </StatTrigger>
      <PopoverContent align="end" className="w-90 p-5">
        <HeartsPanel stats={stats} />
      </PopoverContent>
    </Popover>
  );
}
