"use client";

import { useEffect } from "react";

/** Theme colours for the confetti, read from the design tokens rather than hard-coded. */
const TOKEN_COLOURS = ["--green", "--blue", "--gold", "--red", "--purple", "--orange"];

/** One confetti burst when the lesson-complete screen opens (skipped with animations off). */
export function useConfetti(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let reset: (() => void) | undefined;

    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const styles = getComputedStyle(document.documentElement);
      const colors = TOKEN_COLOURS.map((name) => styles.getPropertyValue(name).trim()).filter(
        (value) => value.length > 0,
      );
      void confetti({
        particleCount: 150,
        spread: 100,
        startVelocity: 45,
        origin: { y: 0.55 },
        colors,
        disableForReducedMotion: true,
      });
      reset = () => confetti.reset();
    });

    return () => {
      cancelled = true;
      reset?.();
    };
  }, [enabled]);
}
