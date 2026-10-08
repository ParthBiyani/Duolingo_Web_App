"use client";

import { useEffect, useEffectEvent } from "react";

import type { Tile } from "@/lib/api";

import { cx } from "../cx";
import { useNumberKeys } from "../keyboard";
import styles from "../lesson.module.css";
import type { MatchState } from "../reducer";
import { NumberBadge } from "./parts";
import type { ExerciseProps } from "./types";

type TileState = "idle" | "selected" | "wrong" | "matched";

/** How long a rejected pair stays red (the shake itself takes 400 ms). */
const WRONG_FLASH_MS = 600;

const TILE_STYLE: Record<TileState, string> = {
  idle: "cursor-pointer border-border bg-surface text-body shadow-edge-border hover:bg-surface-hover active:translate-y-[2px] active:shadow-none",
  selected:
    "cursor-pointer border-selected-border bg-selected-bg text-selected-text shadow-edge-selected",
  wrong:
    "border-red bg-feedback-wrong-bg text-feedback-wrong-text shadow-[0_2px_0_var(--color-red)]",
  matched: "cursor-default border-border bg-surface text-disabled",
};

function tileState(match: MatchState, side: "left" | "right", id: number): TileState {
  if (match.matched.includes(id)) return "matched";
  if (match.wrong?.includes(id)) return "wrong";
  return match[side] === id ? "selected" : "idle";
}

interface MatchTileProps {
  tile: Tile;
  index: number;
  state: TileState;
  locked: boolean;
  onPress: () => void;
}

/** One 255x51 tile; matched tiles flash green, then grey out and stop responding. */
function MatchTile({ tile, index, state, locked, onPress }: MatchTileProps) {
  const matched = state === "matched";
  return (
    <button
      type="button"
      data-lesson-option=""
      aria-pressed={state === "selected"}
      aria-disabled={locked}
      disabled={matched}
      onClick={locked || matched ? undefined : onPress}
      className={cx(
        "relative flex h-[51px] w-full items-center justify-center rounded-tile border-2 px-12 text-base leading-tight font-medium transition-[background-color,border-color,color,translate,box-shadow] duration-100",
        TILE_STYLE[state],
        locked && state === "idle" && "pointer-events-none",
        state === "wrong" && "animate-shake",
        matched && styles.matched,
      )}
    >
      <span className="absolute top-1/2 left-[9px] -translate-y-1/2">
        <NumberBadge index={index} selected={state === "selected"} />
      </span>
      <span className="truncate">{tile.text}</span>
    </button>
  );
}

/** "Select the matching pairs": every pair is checked by the server as soon as it is chosen. */
export function MatchPairs({
  exercise,
  locked,
  match,
  onMatchSelect,
  onMatchFlashEnd,
}: ExerciseProps) {
  const left = exercise.pairs?.left ?? [];
  const right = exercise.pairs?.right ?? [];

  // 1-5 pick from the left column, 6-0 from the right.
  useNumberKeys(left.length + right.length, !locked, (index) => {
    if (index < left.length) onMatchSelect("left", left[index].id);
    else onMatchSelect("right", right[index - left.length].id);
  });

  // A rejected pair shakes and stays red briefly, then returns to normal. A timer (rather than
  // animationend) keeps the red visible even when animations are switched off.
  const endFlash = useEffectEvent((flashKey: number) => onMatchFlashEnd(flashKey));
  const flashing = match.wrong !== null;
  const { flashKey } = match;
  useEffect(() => {
    if (!flashing) return;
    const timer = window.setTimeout(() => endFlash(flashKey), WRONG_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flashing, flashKey]);

  const column = (side: "left" | "right", tiles: Tile[], offset: number) => (
    <div className="flex flex-col gap-3">
      {tiles.map((tile, index) => (
        <MatchTile
          key={tile.id}
          tile={tile}
          index={offset + index}
          state={tileState(match, side, tile.id)}
          locked={locked}
          onPress={() => onMatchSelect(side, tile.id)}
        />
      ))}
    </div>
  );

  return (
    <div
      role="group"
      aria-label={exercise.prompt}
      className="mx-auto grid w-full max-w-[534px] grid-cols-2 gap-x-4 md:gap-x-6"
    >
      {column("left", left, 0)}
      {column("right", right, left.length)}
    </div>
  );
}
