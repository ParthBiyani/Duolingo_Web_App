"use client";

import { useId, useState, type ReactNode } from "react";

import type { Exercise, SourceToken } from "@/lib/api";

import { cx } from "../cx";

/** The hint tokens for an exercise, or null when they do not spell out its source text. */
export function sourceTokens(exercise: Exercise): SourceToken[] | null {
  const tokens = exercise.source_tokens;
  if (tokens.length === 0 || exercise.source_text === null) return null;
  return tokens.map((token) => token.text).join("") === exercise.source_text ? tokens : null;
}

/**
 * One word with a dotted underline. Its English meaning shows just below while a mouse hovers
 * it or it has keyboard focus, and a tap (or click) pins it open. Escape hides it again.
 */
function HintWord({ text, hint, isNew }: { text: string; hint: string; isNew: boolean }) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || focused || pinned;

  const close = () => {
    setHovered(false);
    setFocused(false);
    setPinned(false);
  };

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={tooltipId}
        onClick={() => setPinned((value) => !value)}
        onPointerEnter={(event) => setHovered(event.pointerType === "mouse")}
        onPointerLeave={() => setHovered(false)}
        onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
        onBlur={close}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            // A second Escape still opens the lesson's quit dialog.
            event.stopPropagation();
            close();
          }
        }}
        className={cx(
          "cursor-pointer border-b-2 border-dotted transition-colors",
          open ? "border-current" : "border-current/40 hover:border-current",
          isNew && "text-purple",
        )}
      >
        {text}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        hidden={!open}
        className="absolute top-full left-1/2 z-20 mt-2.5 -translate-x-1/2 animate-fade-in rounded-tile border-2 border-border bg-surface px-3 py-2 text-base font-medium whitespace-nowrap text-body"
      >
        <span
          aria-hidden="true"
          className="absolute -top-[9px] left-1/2 size-4 -translate-x-1/2 rotate-45 border-t-2 border-l-2 border-border bg-surface"
        />
        <span lang="en" className="relative">
          {hint}
        </span>
      </span>
    </span>
  );
}

/** Renders hint tokens as text: every hinted word gets its dotted underline and tooltip. */
export function HintedTokens({
  tokens,
  renderText,
}: {
  tokens: readonly SourceToken[];
  /** Renders a plain (unhinted) slice, e.g. to drop the fill-in gap into it. */
  renderText?: (text: string) => ReactNode;
}) {
  return tokens.map((token, index) =>
    token.hint === null ? (
      <span key={index} className={token.is_new ? "text-purple" : undefined}>
        {renderText ? renderText(token.text) : token.text}
      </span>
    ) : (
      <HintWord key={index} text={token.text} hint={token.hint} isNew={token.is_new} />
    ),
  );
}
