"use client";

import { useState } from "react";

import { Button, Modal, Skeleton, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import { isUnexpectedError, useAdvanceClock, useDemoClock, useMe, useResetDemo } from "@/lib/api";
import { useServerNow } from "@/lib/time";

import { secondsUntilNextMonday } from "./nextMonday";
import { demoStrings } from "./strings";

const HOUR = 3600;
const DAY = 24 * HOUR;

/**
 * Reviewer panel for the simulated clock (hearts regenerate, streaks and leagues roll over with
 * it). Hidden when the build sets NEXT_PUBLIC_DEMO_TOOLS=false; the backend also refuses these
 * endpoints unless DEMO_TOOLS=true, which the panel reports instead of the controls.
 */
export function DemoTools() {
  if (process.env.NEXT_PUBLIC_DEMO_TOOLS === "false") return null;
  return <DemoToolsPanel />;
}

function DemoToolsPanel() {
  const clock = useDemoClock();
  const me = useMe();
  const advance = useAdvanceClock();
  const reset = useResetDemo();
  const now = useServerNow();
  const [confirming, setConfirming] = useState(false);
  const timeZone = me.data?.user.timezone ?? "UTC";

  // Both mutations invalidate every query on success, so all screens refetch at the new time.
  const move = (seconds: number, label: string) =>
    advance.mutate(seconds, {
      onSuccess: () => toast.success(demoStrings.advanced(label), { id: "demo-clock" }),
      onError: (error) => {
        if (!isUnexpectedError(error)) toast.error(demoStrings.advanceFailed);
      },
    });

  const confirmReset = () =>
    reset.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast.success(demoStrings.resetDone, { id: "demo-reset" });
      },
      onError: (error) => {
        if (!isUnexpectedError(error)) toast.error(demoStrings.resetFailed);
      },
    });

  const actions = [
    { label: demoStrings.actions.hour, seconds: () => HOUR },
    { label: demoStrings.actions.fiveHours, seconds: () => 5 * HOUR },
    { label: demoStrings.actions.day, seconds: () => DAY },
    {
      label: demoStrings.actions.nextMonday,
      seconds: () => secondsUntilNextMonday(new Date(now), timeZone),
    },
  ];

  return (
    <section
      aria-labelledby="demo-tools-heading"
      className="mt-10 rounded-rail border-2 border-dashed border-border p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="demo-tools-heading" className="text-lead font-bold text-title">
          {demoStrings.title}
        </h2>
        <span className="rounded-full bg-raised px-2.5 py-1 text-caps text-muted uppercase">
          {demoStrings.badge}
        </span>
      </div>
      <p className="mt-2 text-muted">{demoStrings.description}</p>

      {clock.isError ? (
        <p className="mt-4 font-bold text-body">{demoStrings.unavailable}</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
            <dt className="text-muted">{demoStrings.serverTime}</dt>
            <dd className="font-bold text-title tabular-nums">
              {clock.isPending ? (
                <Skeleton className="inline-block h-4 w-44 align-middle" />
              ) : (
                formatServerTime(now, timeZone)
              )}
            </dd>
            <dt className="text-muted">{demoStrings.offset}</dt>
            <dd className="font-bold text-title">
              {clock.data ? (
                formatOffset(clock.data.offset_seconds)
              ) : (
                <Skeleton className="inline-block h-4 w-24 align-middle" />
              )}
            </dd>
          </dl>
          <p className="mt-1 text-caps font-medium text-muted">{demoStrings.timeZone(timeZone)}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                disabled={clock.isPending || advance.isPending}
                onClick={() => move(action.seconds(), action.label)}
              >
                {action.label}
              </Button>
            ))}
          </div>

          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => setConfirming(true)}
            disabled={clock.isPending}
          >
            {demoStrings.reset}
          </Button>
        </>
      )}

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title={demoStrings.resetTitle}
        description={demoStrings.resetBody}
      >
        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="danger"
            size="lg"
            fullWidth
            loading={reset.isPending}
            onClick={confirmReset}
          >
            {demoStrings.resetConfirm}
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={() => setConfirming(false)}>
            {demoStrings.resetCancel}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

/** "Fri 9 Oct 2026, 07:20:05" in the learner's time zone. */
function formatServerTime(epochMs: number, timeZone: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  };
  try {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(epochMs);
  } catch {
    return new Intl.DateTimeFormat("en-GB", options).format(epochMs);
  }
}

/** "+1 day 5 hours" ahead of real time, or "Real time" when the clock is not moved. */
function formatOffset(seconds: number): string {
  if (seconds <= 0) return demoStrings.noOffset;
  const days = Math.floor(seconds / DAY);
  const hours = Math.floor((seconds % DAY) / HOUR);
  const minutes = Math.floor((seconds % HOUR) / 60);
  const parts = [
    days > 0 ? strings.time.days(days) : null,
    hours > 0 ? strings.time.hours(hours) : null,
    minutes > 0 && days === 0 ? strings.time.minutes(minutes) : null,
  ].filter(Boolean);
  return `+${parts.join(" ") || strings.time.minutes(1)}`;
}
