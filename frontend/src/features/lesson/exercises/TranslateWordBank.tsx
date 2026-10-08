"use client";

import { LayoutGroup, motion } from "motion/react";

import type { Tile } from "@/lib/api";

import { cx } from "../cx";
import { useBackspaceKey, useNumberKeys } from "../keyboard";
import { lessonStrings } from "../strings";
import { SourceLine, SpeechBubble, audioText, characterFor, useAutoplay } from "./parts";
import type { ExerciseProps } from "./types";

/** Box shared by tiles and their placeholders so a placeholder is exactly a tile's size (51px). */
const TILE_BOX =
  "rounded-tile border-2 px-4 py-3 text-[19px] leading-[23px] font-medium whitespace-nowrap";

/** Answer lines every 60px; tiles (51px + 9px row gap) sit just above each line. */
const ANSWER_LINES =
  "bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_58px,var(--color-border)_58px,var(--color-border)_60px)]";

/** Tile flight between the bank and the answer: a short layout spring. */
const FLY = { type: "spring", duration: 0.3, bounce: 0.15 } as const;

interface WordTileProps {
  tile: Tile;
  layoutId: string;
  locked: boolean;
  onPress: () => void;
  className?: string;
}

function WordTile({ tile, layoutId, locked, onPress, className }: WordTileProps) {
  return (
    <motion.button
      layoutId={layoutId}
      transition={FLY}
      type="button"
      data-lesson-option=""
      aria-disabled={locked}
      onClick={locked ? undefined : onPress}
      className={cx(
        TILE_BOX,
        "border-border bg-surface text-body shadow-edge-border",
        locked
          ? "cursor-default"
          : "cursor-pointer hover:bg-surface-hover active:translate-y-[2px] active:shadow-none",
        className,
      )}
    >
      {tile.text}
    </motion.button>
  );
}

/** "Write this in English/Spanish" with tiles: tap words into the answer lines. */
export function TranslateWordBank({
  exercise,
  draft,
  onDraft,
  locked,
  autoplayAudio,
}: ExerciseProps) {
  const chosen = draft !== null && "tile_ids" in draft ? draft.tile_ids : [];
  const { tiles } = exercise;
  const tilesById = new Map(tiles.map((tile) => [tile.id, tile]));
  const answerLang = exercise.source_lang === "es" ? "en" : "es";
  const tileKey = (id: number) => `word-${exercise.id}-${id}`;

  const add = (id: number) => {
    if (!locked && !chosen.includes(id)) onDraft({ tile_ids: [...chosen, id] });
  };
  const remove = (id: number) => {
    if (!locked) onDraft({ tile_ids: chosen.filter((chosenId) => chosenId !== id) });
  };

  useNumberKeys(tiles.length, !locked, (index) => add(tiles[index].id));
  useBackspaceKey(!locked && chosen.length > 0, () => remove(chosen[chosen.length - 1]));
  useAutoplay(exercise.source_lang === "es" ? audioText(exercise) : null, autoplayAudio);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {exercise.source_text ? (
        <SpeechBubble variant={characterFor(exercise)}>
          <SourceLine exercise={exercise} />
        </SpeechBubble>
      ) : null}

      <LayoutGroup id={`word-bank-${exercise.id}`}>
        <div
          role="group"
          aria-label={lessonStrings.answerLabel}
          lang={answerLang}
          className={cx(
            "flex min-h-[120px] flex-wrap content-start gap-x-1.5 gap-y-[9px] pt-1",
            ANSWER_LINES,
          )}
        >
          {chosen.map((id) => {
            const tile = tilesById.get(id);
            return tile ? (
              <WordTile
                key={id}
                tile={tile}
                layoutId={tileKey(id)}
                locked={locked}
                onPress={() => remove(id)}
              />
            ) : null;
          })}
        </div>

        <div
          role="group"
          aria-label={lessonStrings.wordBankLabel}
          lang={answerLang}
          className="flex flex-wrap justify-center gap-2"
        >
          {tiles.map((tile) => (
            <div key={tile.id} className="relative">
              {/* The grey slot stays behind when its tile flies up to the answer. */}
              <span
                aria-hidden="true"
                className={cx(
                  TILE_BOX,
                  "block border-transparent bg-border text-transparent select-none",
                )}
              >
                {tile.text}
              </span>
              {chosen.includes(tile.id) ? null : (
                <WordTile
                  tile={tile}
                  layoutId={tileKey(tile.id)}
                  locked={locked}
                  onPress={() => add(tile.id)}
                  className="absolute inset-0"
                />
              )}
            </div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}
