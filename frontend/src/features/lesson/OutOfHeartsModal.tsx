"use client";

import type { ReactNode } from "react";

import { Dumbbell, Gem, Heart, HeartEmpty } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { Button, Modal, ModalDescription, ModalTitle } from "@/components/ui";

import { lessonStrings } from "./strings";

interface OptionRowProps {
  icon: ReactNode;
  title: string;
  note?: string;
  trailing?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  onClick?: () => void;
}

function OptionRow({
  icon,
  title,
  note,
  trailing,
  disabled = false,
  busy = false,
  onClick,
}: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className="flex w-full items-center gap-3 rounded-panel border-2 border-border bg-surface px-4 py-3 text-left shadow-edge-border transition-[background-color,translate,box-shadow] duration-100 enabled:cursor-pointer enabled:hover:bg-surface-hover enabled:active:translate-y-[2px] enabled:active:shadow-none disabled:cursor-default disabled:opacity-60"
    >
      <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-button text-title uppercase">{title}</span>
        {note ? (
          <span className="mt-0.5 block text-caps font-semibold tracking-normal text-muted">
            {note}
          </span>
        ) : null}
      </span>
      {trailing}
    </button>
  );
}

interface OutOfHeartsModalProps {
  open: boolean;
  /** The learner's gem balance, or null while it is still loading. */
  gems: number | null;
  refilling: boolean;
  onRefill: () => void;
  onPractice: () => void;
  onNoThanks: () => void;
}

/**
 * Hearts hit zero: refill with gems (450 here, more than the shop), practice to earn a heart,
 * unlimited hearts (coming soon), or leave. It cannot be dismissed without choosing.
 */
export function OutOfHeartsModal({
  open,
  gems,
  refilling,
  onRefill,
  onPractice,
  onNoThanks,
}: OutOfHeartsModalProps) {
  const price = lessonStrings.refillPrice;
  const missing = gems === null ? 0 : Math.max(0, price - gems);

  return (
    <Modal open={open} onOpenChange={() => undefined} dismissible={false}>
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex items-end justify-center gap-1">
          <Mascot pose="hug-heart" size={120} />
          <span className="relative grid size-24 place-items-center">
            {/* A soft spotlight on the empty heart. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,var(--color-border),transparent)]"
            />
            <HeartEmpty size={60} className="relative" />
          </span>
        </div>
        <div>
          <ModalTitle>{lessonStrings.outOfHeartsTitle}</ModalTitle>
          <ModalDescription>{lessonStrings.outOfHeartsBody}</ModalDescription>
        </div>
        <div className="flex w-full flex-col gap-3">
          <OptionRow
            icon={
              <>
                <Heart size={40} />
                <span className="absolute inset-0 grid place-items-center pb-1 text-[15px] font-extrabold text-on-red">
                  {lessonStrings.unlimitedGlyph}
                </span>
              </>
            }
            title={lessonStrings.unlimitedHearts}
            disabled
            trailing={
              <span className="shrink-0 rounded-md bg-surface-hover px-2 py-1 text-caps text-muted uppercase">
                {lessonStrings.comingSoon}
              </span>
            }
          />
          <OptionRow
            icon={<Heart size={40} />}
            title={lessonStrings.refillHearts}
            note={missing > 0 ? lessonStrings.needGems(missing) : undefined}
            disabled={missing > 0}
            busy={refilling}
            onClick={onRefill}
            trailing={
              <span className="flex shrink-0 items-center gap-1 text-button text-blue">
                <Gem size={22} />
                {price}
              </span>
            }
          />
          <OptionRow
            icon={<Dumbbell size={40} />}
            title={lessonStrings.practiceForHearts}
            note={lessonStrings.practiceForHeartsNote}
            onClick={onPractice}
          />
        </div>
        <Button variant="ghost" size="lg" fullWidth onClick={onNoThanks}>
          {lessonStrings.noThanks}
        </Button>
      </div>
    </Modal>
  );
}
