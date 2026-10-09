"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Bolt, DuoImage, FlagES, Flame, Gem, Snowflake } from "@/components/icons";
import {
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
import { STREAK_SOCIETY_DAYS, StreakModal } from "@/features/streak/StreakModal";
import { isApiError, useRefillHearts, useShop, type MeResponse, type StreakDay } from "@/lib/api";
import { formatCountdown, useServerNow } from "@/lib/time";

import { SETTINGS_HREF } from "./nav-items";

type Stats = MeResponse["stats"];

/** Shop price used until the catalogue has loaded (plan: 350 gems in the shop). */
const FALLBACK_REFILL_PRICE = 350;

const formatNumber = (value: number) => value.toLocaleString("en-US");

const showComingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

/** How long the pointer may be off both the stat and its panel before the panel closes. */
const HOVER_CLOSE_DELAY_MS = 150;

interface HoverHandlers {
  onPointerEnter: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
}

/** Hover handlers for the stat itself and for its panel. */
interface HoverParts {
  trigger: HoverHandlers;
  panel: HoverHandlers;
}

const HoverContext = createContext<HoverParts | null>(null);

/** Closes the surrounding stat popover, even while the mouse is still over it. */
const CloseContext = createContext<() => void>(() => undefined);

/**
 * A stat popover that, like the original, opens while a mouse hovers the stat or its panel.
 * Clicks and taps still toggle it, so touch screens and keyboards work as before.
 */
function StatPopover({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const onStat = useRef(false);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const hover = (part: "trigger" | "panel"): HoverHandlers => ({
    onPointerEnter: (event) => {
      if (event.pointerType !== "mouse") return;
      if (part === "trigger") onStat.current = true;
      window.clearTimeout(closeTimer.current);
      setOpen(true);
    },
    onPointerLeave: (event) => {
      if (event.pointerType !== "mouse") return;
      if (part === "trigger") onStat.current = false;
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
    },
  });

  const close = () => {
    onStat.current = false;
    window.clearTimeout(closeTimer.current);
    setOpen(false);
  };

  return (
    <HoverContext.Provider value={{ trigger: hover("trigger"), panel: hover("panel") }}>
      <CloseContext.Provider value={close}>
        <Popover
          open={open}
          // A click on a stat the mouse already opened would toggle it shut: keep it open instead.
          // Closing from inside the panel (a link, Escape) still closes it.
          onOpenChange={(next) => {
            if (!next) window.clearTimeout(closeTimer.current);
            setOpen(next || onStat.current);
          }}
        >
          {children}
        </Popover>
      </CloseContext.Provider>
    </HoverContext.Provider>
  );
}

/**
 * The panel of a stat popover; keeps it open while the mouse is over it. Radix gives the panel
 * the dialog role, so it is named after its heading (`label`) for assistive tech.
 */
function StatContent({
  label,
  ...props
}: ComponentProps<typeof PopoverContent> & { label: string }) {
  const hover = useContext(HoverContext);
  return <PopoverContent aria-label={label} {...props} {...hover?.panel} />;
}

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
  const hover = useContext(HoverContext);
  return (
    <PopoverTrigger
      {...hover?.trigger}
      aria-label={label}
      className={cn(
        "flex h-11 items-center gap-1 rounded-xl px-1 text-[15px] leading-5 font-bold transition-colors hover:bg-surface-hover data-[state=open]:bg-surface-hover min-[400px]:gap-2 min-[400px]:px-2",
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
    <StatPopover>
      <StatTrigger label={strings.stats.course.trigger(course.title)}>
        <FlagES size={31} className="rounded-[18%] outline-2 outline-border dark:outline-white" />
        <span className="text-[16px] leading-6 text-title">1</span>
      </StatTrigger>
      <StatContent label={strings.stats.course.heading} className="w-72">
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
      </StatContent>
    </StatPopover>
  );
}

// Streak -----------------------------------------------------------------------

const DAY_CIRCLE: Record<StreakDay["status"], string> = {
  extended: "bg-streak-day",
  frozen: "border-2 border-selected-border bg-selected-bg",
  missed: "bg-locked-face",
  pending: "bg-locked-face",
  future: "bg-locked-face",
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
          <span
            aria-hidden="true"
            className={cn(
              "text-[17px] leading-[25px] font-bold text-disabled",
              day.status === "pending" && "text-streak-day",
            )}
          >
            {day.label}
          </span>
          <span
            className={cn(
              "grid size-[34px] place-items-center rounded-full",
              DAY_CIRCLE[day.status],
            )}
          >
            {day.status === "extended" ? <DuoImage name="streak-day-check" size={17} /> : null}
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

/** The popover's last button: closes it and opens the Streak modal in its place. */
function ViewMoreButton({ onOpenModal }: { onOpenModal: () => void }) {
  const closePopover = useContext(CloseContext);
  return (
    <button
      type="button"
      onClick={() => {
        closePopover();
        onOpenModal();
      }}
      className={buttonClassName({
        variant: "secondary",
        size: "lg",
        fullWidth: true,
        className: "-mt-1 rounded-xl",
      })}
    >
      {strings.stats.streak.viewMore}
    </button>
  );
}

export function StreakPopover({ streak }: { streak: Stats["streak"] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const extended = streak.extended_today;
  const member = streak.current >= STREAK_SOCIETY_DAYS;
  const message = extended
    ? strings.stats.streak.extended
    : streak.current > 0
      ? strings.stats.streak.pending
      : strings.stats.streak.start;

  return (
    <>
      <StatPopover>
        <StatTrigger
          label={strings.stats.streak.trigger(streak.current)}
          className={extended ? "text-orange" : "text-disabled"}
        >
          <Flame size={23} muted={!extended} />
          {formatNumber(streak.current)}
        </StatTrigger>
        <StatContent
          label={strings.stats.streak.title(streak.current)}
          className="w-[387px] overflow-hidden p-0"
        >
          <div className={cn("px-[22px] pt-6 pb-5", extended ? "bg-streak-header" : "bg-raised")}>
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h2
                  className={cn(
                    "text-[25px] leading-[34px] font-bold",
                    extended ? "text-white" : "text-title",
                  )}
                >
                  {strings.stats.streak.title(streak.current)}
                </h2>
                <p className={cn("mt-2 leading-6", extended ? "text-white" : "text-muted")}>
                  {message}
                </p>
              </div>
              <DuoImage
                name="streak-calendar-flame"
                size={64}
                className={cn("mt-4 shrink-0", !extended && "grayscale")}
              />
            </div>
            {streak.week.length > 0 ? (
              <div className="mt-6 rounded-xl bg-surface px-4 pt-3 pb-4">
                <WeekStrip week={streak.week} />
              </div>
            ) : null}
            {streak.freezes > 0 ? (
              <p
                className={cn(
                  "mt-3 flex items-center gap-2 font-bold",
                  extended ? "text-white" : "text-muted",
                )}
              >
                <Snowflake size={20} />
                {strings.stats.streak.freezes(streak.freezes)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-5 p-5">
            <div className="flex h-[136px] items-center overflow-hidden rounded-2xl bg-friend-streak">
              <DuoImage name="friend-streaks" size={142} className="shrink-0 self-end" />
              <div className="min-w-0 flex-1 pr-5 text-white">
                <p className="leading-5 font-bold">{strings.stats.streak.friendTitle}</p>
                <p className="mt-1 leading-6">{strings.stats.streak.friendBody}</p>
                <button
                  type="button"
                  onClick={showComingSoon}
                  className="mt-3 h-10 w-full rounded-xl bg-white text-button text-friend-streak uppercase shadow-[0_3px_0_rgb(0_0_0/0.15)] active:translate-y-0.5 active:shadow-none"
                >
                  {strings.stats.streak.viewList}
                </button>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-border p-5">
              <div className="flex gap-6">
                <DuoImage
                  name={member ? "streak-calendar-flame" : "streak-society-locked"}
                  size={58}
                  className="shrink-0 self-start"
                />
                <div className="min-w-0">
                  <p className="leading-6 font-bold text-title">
                    {strings.stats.streak.societyTitle}
                  </p>
                  <p className="mt-2 leading-6 text-muted dark:text-body">
                    {member ? strings.stats.streak.societyMember : strings.stats.streak.societyBody}
                  </p>
                </div>
              </div>
            </div>
            <ViewMoreButton onOpenModal={() => setModalOpen(true)} />
          </div>
        </StatContent>
      </StatPopover>
      <StreakModal open={modalOpen} onOpenChange={setModalOpen} streak={streak} />
    </>
  );
}

// XP ---------------------------------------------------------------------------

/** Total XP, with today's progress towards the daily goal in the popover. */
export function XpPopover({ stats }: { stats: Stats }) {
  const goal = stats.daily_goal_xp;
  const reached = stats.today_xp >= goal;

  return (
    <StatPopover>
      <StatTrigger label={strings.stats.xp.trigger(stats.xp_total)} className="text-gold-shade">
        <Bolt
          size={20}
          className="[filter:drop-shadow(1.5px_0_0_white)_drop-shadow(-1.5px_0_0_white)_drop-shadow(0_1.5px_0_white)_drop-shadow(0_-1.5px_0_white)]"
        />
        {formatNumber(stats.xp_total)}
      </StatTrigger>
      <StatContent label={strings.stats.xp.title(stats.xp_total)} className="w-80 p-5">
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
      </StatContent>
    </StatPopover>
  );
}

// Gems -------------------------------------------------------------------------

export function GemsPopover({ gems }: { gems: number }) {
  return (
    <StatPopover>
      <StatTrigger label={strings.stats.gems.trigger(gems)} className="text-blue">
        <Gem size={22} />
        {formatNumber(gems)}
      </StatTrigger>
      <StatContent label={strings.stats.gems.title} className="w-[383px] py-5 pr-6 pl-3">
        <div className="flex items-center gap-3">
          <DuoImage name="gems-chest" size={100} className="shrink-0" />
          <div className="min-w-0">
            <h2 className="text-[24px] leading-[26px] font-bold text-title">
              {strings.stats.gems.title}
            </h2>
            <p className="mt-2.5 leading-5 text-muted dark:text-body">
              {strings.stats.gems.balance(gems)}
            </p>
            <PopoverClose asChild>
              <Link
                href="/shop"
                className="mt-3 inline-block rounded-md text-button leading-[18px] text-blue uppercase hover:brightness-110"
              >
                {strings.stats.gems.shop}
              </Link>
            </PopoverClose>
          </div>
        </div>
      </StatContent>
    </StatPopover>
  );
}

// Hearts -----------------------------------------------------------------------

function NextHeartCountdown({ at }: { at: string }) {
  const now = useServerNow();
  return <span className="text-red tabular-nums">{formatCountdown(Date.parse(at) - now)}</span>;
}

/** One action row of the hearts panel: a bordered, pressable bar with caps label. */
const heartRow =
  "flex h-[50px] w-full items-center justify-between gap-3 rounded-2xl border-2 border-b-4 border-border px-3 text-button leading-[18px] text-title uppercase transition-[translate,background-color] duration-100 hover:bg-surface-hover active:translate-y-0.5 active:border-b-2 disabled:cursor-default disabled:opacity-60 disabled:active:translate-y-0 disabled:active:border-b-4";

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
      <h2 className="text-center text-[25px] leading-7 font-bold text-title">
        {strings.stats.hearts.title}
      </h2>
      <div className="mt-[18px] flex justify-center gap-1.5">
        {Array.from({ length: stats.hearts_max }, (_, index) => (
          <DuoImage key={index} name={index < stats.hearts ? "heart" : "heart-empty"} size={28} />
        ))}
      </div>
      <div className="mt-[18px] text-center" aria-live="polite">
        {full ? (
          <p className="text-[19px] leading-5 font-bold text-title">{strings.stats.hearts.full}</p>
        ) : stats.next_heart_at ? (
          <p className="text-[19px] leading-5 font-bold text-title">
            {strings.stats.hearts.nextHeart} <NextHeartCountdown at={stats.next_heart_at} />
          </p>
        ) : (
          <p className="text-[19px] leading-5 font-bold text-title">{strings.stats.hearts.empty}</p>
        )}
        <p className="mt-3 leading-6 text-muted dark:text-body">
          {full
            ? strings.stats.hearts.fullHint
            : stats.hearts > 0
              ? strings.stats.hearts.partialHint
              : strings.stats.hearts.emptyHint}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <button type="button" className={heartRow} onClick={showComingSoon}>
          <span className="flex items-center gap-2">
            <DuoImage name="heart-unlimited" size={36} />
            {strings.stats.hearts.unlimited}
          </span>
          <span className="text-magenta">{strings.stats.hearts.freeTrial}</span>
        </button>
        <button
          type="button"
          className={heartRow}
          disabled={full || !affordable || refill.isPending}
          onClick={handleRefill}
        >
          <span className="flex items-center gap-2">
            <DuoImage name="heart-refill" size={36} />
            {strings.stats.hearts.refill}
          </span>
          <span className="flex items-center text-blue">
            <DuoImage name="gem-small" size={24} />
            {formatNumber(price)}
          </span>
        </button>
        <PopoverClose asChild>
          <Link href="/practice" className={heartRow}>
            <span className="flex items-center gap-2">
              <DuoImage name="heart" size={36} />
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
    <StatPopover>
      <StatTrigger
        label={strings.stats.hearts.trigger(stats.hearts)}
        className={empty ? "text-disabled" : "text-red"}
      >
        <DuoImage name={empty ? "heart-empty" : "heart-bar"} size={28} />
        {stats.hearts}
      </StatTrigger>
      <StatContent
        label={strings.stats.hearts.title}
        align="end"
        className="w-[402px] px-7 pt-7 pb-6"
      >
        <HeartsPanel stats={stats} />
      </StatContent>
    </StatPopover>
  );
}
