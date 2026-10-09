"use client";

import { useEffect, useRef } from "react";

import type { MascotSide } from "./layout";

/** The characters that stand beside the path, in the order they appear down the course. */
const CHARACTERS = [
  "duo-twirl",
  "bea-tennis",
  "junior-pogo",
  "lily-shirts",
  "zari-kick",
  "oscar-painting",
  "eddy-basketball",
  "vikram-pancakes",
] as const;

/** The animation's square canvas; the character fills about its middle 40%. */
const CANVAS_SIZE = 260;
/** Half of a character's visible width plus a little air, so it never pokes out of a narrow column. */
const EDGE_ALLOWANCE = 70;
/** Width of the still drawing shown for locked units. */
const LOCKED_WIDTH = 294;

export function characterFor(order: number): string {
  return CHARACTERS[order % CHARACTERS.length];
}

interface PathMascotProps {
  side: MascotSide;
  /** Which character: see `characterFor`. */
  character: string;
  /** The unit is not open yet: show the character greyed out and still. */
  locked: boolean;
}

/**
 * A character standing in the empty space beside a swing of the path: animated in units the
 * learner has reached, a grey still in locked ones. Its distance from the centre is capped by the
 * column width so it fits from phone to desktop. With reduced motion it shows the first frame.
 */
export function PathMascot({ side, character, locked }: PathMascotProps) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = box.current;
    if (locked || !container) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void import("lottie-web/build/player/lottie_light").then(({ default: lottie }) => {
      if (cancelled) return;
      const animation = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: !still,
        path: `/duo/characters/${character}.json`,
      });
      destroy = () => animation.destroy();
    });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [character, locked]);

  const distance = `min(150px, 50% - ${EDGE_ALLOWANCE}px)`;
  const left = side === "right" ? `calc(50% + ${distance})` : `calc(50% - ${distance})`;

  if (locked) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ left, width: LOCKED_WIDTH }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG stills */}
        <img
          src={`/duo/characters/${character}-locked.svg`}
          alt=""
          className="w-full dark:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG stills */}
        <img
          src={`/duo/characters/${character}-locked-dark.svg`}
          alt=""
          className="hidden w-full dark:block"
        />
      </div>
    );
  }

  return (
    <div
      ref={box}
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left, width: CANVAS_SIZE, height: CANVAS_SIZE }}
    />
  );
}
