"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/** One roll per page load picks the fact, so re-renders never swap it mid-load. */
const pageRoll = Math.random();
const clientRoll = () => pageRoll;
const serverRoll = () => null;
const noSubscription = () => () => {};

interface DuoLoadingProps {
  /** Small caps caption under the owl. */
  caption: string;
  /** Short lines shown under the caption; one is picked per mount. */
  facts?: readonly string[];
  /** Screen-reader description of what is loading. */
  label: string;
}

/**
 * The full-screen loading state: the dancing owl, a caption and a fact, fading in so quick
 * loads never flash. The animation follows the theme on <html> and holds still with reduced
 * motion.
 */
export function DuoLoading({ caption, facts = [], label }: DuoLoadingProps) {
  const box = useRef<HTMLDivElement>(null);
  // The server renders no fact, so hydration matches; the client then shows its pick.
  const roll = useSyncExternalStore(noSubscription, clientRoll, serverRoll);
  const fact = roll === null || facts.length === 0 ? null : facts[Math.floor(roll * facts.length)];

  useEffect(() => {
    const container = box.current;
    if (!container) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    void import("lottie-web/build/player/lottie_light")
      .then(({ default: lottie }) => {
        if (cancelled) return;
        const animation = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: true,
          autoplay: !still,
          path: `/duo/lottie/loading-${theme}.json`,
        });
        destroy = () => animation.destroy();
      })
      .catch(() => {
        // Without the animation the caption alone still says what is happening.
      });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-1 animate-[fade-in_600ms_ease-out_200ms_both] flex-col items-center justify-center px-4 py-10 text-center"
    >
      <div ref={box} aria-hidden="true" className="h-[130px] w-[139px]" />
      <p
        aria-hidden="true"
        className="mt-6 text-[13px] font-bold tracking-[0.8px] text-disabled uppercase"
      >
        {caption}
      </p>
      {fact && (
        <p aria-hidden="true" className="mt-3 max-w-[340px] text-[17px] text-body">
          {fact}
        </p>
      )}
    </div>
  );
}
