"use client";

import Link from "next/link";
import { useState, type ReactElement, type ReactNode } from "react";

import { Trophy } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import type { PathNode, UnitColor } from "@/lib/api/types";

import { nextLessonNumber } from "./nodeVisual";
import { pathStrings } from "./strings";
import { unitColorStyle } from "./unitColors";

/** Claims a chest node; resolves to true when the reward was granted. */
export type OpenChestHandler = (node: PathNode) => Promise<boolean>;

interface NodePopoverProps {
  node: PathNode;
  color: UnitColor;
  onOpenChest: OpenChestHandler;
  /** The node button; Radix attaches the trigger behaviour and ref to it. */
  children: ReactElement;
  /** First node of a locked unit: offer to jump ahead to this unit (its number). */
  jumpToUnit?: number;
}

const ACTION_BASE =
  "flex h-[50px] w-full items-center justify-center gap-2 rounded-button text-button uppercase focus-visible:outline-white";

const ACTION_VARIANT = {
  solid:
    "border-b-4 border-(--unit-shade) bg-white text-(--unit-face) transition-[translate] duration-100 active:translate-y-0.5 active:border-b-2",
  outline:
    "border-2 border-white/60 text-white transition-colors duration-100 hover:bg-white/10 active:translate-y-0.5",
  locked: "bg-locked-face text-locked-icon",
} as const;

/**
 * The card that opens under a path node, built on the shared Popover (Radix: focus management,
 * Escape, outside clicks, collision-aware placement). It is painted in the unit colour, or grey
 * when the node is locked.
 */
export function NodePopover({ node, color, onOpenChest, jumpToUnit, children }: NodePopoverProps) {
  const [open, setOpen] = useState(false);
  const locked = node.state === "locked" && jumpToUnit === undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="bottom"
        sideOffset={10}
        aria-label={node.title}
        style={unitColorStyle(color)}
        className={`w-[295px] ${locked ? "bg-surface-hover text-disabled" : "border-(--unit-face) bg-(--unit-face) text-white"}`}
        arrowClassName={locked ? "fill-surface-hover" : "fill-(--unit-face) stroke-(--unit-face)"}
      >
        {jumpToUnit !== undefined ? (
          <CardText title={pathStrings.jumpTitle(jumpToUnit)} body={pathStrings.jumpBody}>
            <button
              type="button"
              onClick={() => toast(strings.common.comingSoon, { id: "coming-soon" })}
              className={`${ACTION_BASE} ${ACTION_VARIANT.solid}`}
            >
              {pathStrings.jumpHere}
            </button>
          </CardText>
        ) : (
          <PopoverBody node={node} onOpenChest={onOpenChest} onDone={() => setOpen(false)} />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface BodyProps {
  node: PathNode;
  onOpenChest: OpenChestHandler;
  onDone: () => void;
}

function PopoverBody({ node, onOpenChest, onDone }: BodyProps) {
  if (node.state === "locked") {
    return (
      <CardText title={node.title} body={pathStrings.lockedHint}>
        <button type="button" disabled className={`${ACTION_BASE} ${ACTION_VARIANT.locked}`}>
          {pathStrings.locked}
        </button>
      </CardText>
    );
  }

  if (node.type === "chest") {
    return <ChestBody node={node} onOpenChest={onOpenChest} onDone={onDone} />;
  }

  if (node.state === "active") {
    const subtitle =
      node.type === "unit_review"
        ? pathStrings.unitReviewHint
        : node.lessons_total > 0
          ? pathStrings.lessonOf(nextLessonNumber(node), node.lessons_total)
          : pathStrings.practiceHint;
    const href = node.next_lesson_id === null ? "/practice" : `/lesson/${node.next_lesson_id}`;
    return (
      <CardText title={node.title} body={subtitle}>
        <ActionLink href={href} variant="solid">
          {pathStrings.startXp}
        </ActionLink>
      </CardText>
    );
  }

  // Completed or legendary: review it again, or (lesson skills) take the legendary challenge.
  const reviewHref =
    node.next_lesson_id === null ? null : `/lesson/${node.next_lesson_id}?kind=review`;
  const canGoLegendary = node.state === "completed" && node.type === "lesson";
  return (
    <CardText
      title={node.title}
      body={node.state === "legendary" ? pathStrings.legendaryHint : pathStrings.completedHint}
    >
      {canGoLegendary ? (
        <ActionLink href={`/legendary/${node.id}`} variant="solid">
          <Trophy size={22} />
          {pathStrings.legendaryXp}
        </ActionLink>
      ) : null}
      {reviewHref ? (
        <ActionLink href={reviewHref} variant={canGoLegendary ? "outline" : "solid"}>
          {pathStrings.reviewXp}
        </ActionLink>
      ) : null}
    </CardText>
  );
}

function ChestBody({ node, onOpenChest, onDone }: BodyProps) {
  const [busy, setBusy] = useState(false);

  if (node.state !== "active") {
    return <CardText title={node.title} body={pathStrings.chestClaimedHint} />;
  }

  const open = async () => {
    setBusy(true);
    const granted = await onOpenChest(node);
    setBusy(false);
    if (granted) onDone();
  };

  return (
    <CardText title={node.title} body={pathStrings.chestHint}>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        aria-busy={busy || undefined}
        className={`${ACTION_BASE} ${ACTION_VARIANT.solid} disabled:opacity-80`}
      >
        {pathStrings.openChest}
      </button>
    </CardText>
  );
}

function CardText({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <>
      <p className="text-[17px] leading-6 font-bold">{title}</p>
      <p className="mt-1 text-[15px] leading-5 font-medium opacity-90">{body}</p>
      {children ? <div className="mt-4 flex flex-col gap-3">{children}</div> : null}
    </>
  );
}

function ActionLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "solid" | "outline";
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${ACTION_BASE} ${ACTION_VARIANT[variant]}`}>
      {children}
    </Link>
  );
}
