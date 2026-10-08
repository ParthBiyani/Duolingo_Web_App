"use client";

import { useEffect, useEffectEvent } from "react";

/** Marks exercise controls (options, tiles) on which Enter should still CHECK / CONTINUE. */
export const OPTION_ATTR = "data-lesson-option";

/** "1".."9" -> 0..8 and "0" -> 9 (the tenth item); null for any other key. */
export function digitIndex(key: string): number | null {
  if (key.length !== 1 || key < "0" || key > "9") return null;
  return key === "0" ? 9 : Number(key) - 1;
}

/** The badge shown next to the item at `index` (1..9, then 0 for the tenth). */
export function digitLabel(index: number): string {
  return String((index + 1) % 10);
}

/** Keys typed into a text field belong to the field, not to lesson shortcuts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  return (
    target instanceof HTMLInputElement && !["button", "checkbox", "radio"].includes(target.type)
  );
}

/**
 * True when Enter should be left to a focused control (a button or link that is not an exercise
 * option), so its own click handler runs instead of the lesson's CHECK / CONTINUE shortcut.
 */
export function isOwnEnterTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest("button, a[href], [role='button']");
  return control !== null && control.closest(`[${OPTION_ATTR}]`) === null;
}

function isPlainKey(event: KeyboardEvent): boolean {
  return !event.defaultPrevented && !event.altKey && !event.ctrlKey && !event.metaKey;
}

/** Calls `onPick(index)` for the number keys 1-9 and 0 while `enabled`. */
export function useNumberKeys(count: number, enabled: boolean, onPick: (index: number) => void) {
  const pick = useEffectEvent(onPick);
  useEffect(() => {
    if (!enabled || count === 0) return;
    function onKeyDown(event: KeyboardEvent) {
      if (!isPlainKey(event) || event.repeat || isTypingTarget(event.target)) return;
      const index = digitIndex(event.key);
      if (index === null || index >= count) return;
      event.preventDefault();
      pick(index);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, enabled]);
}

/** Calls `onBackspace` for Backspace outside text fields while `enabled`. */
export function useBackspaceKey(enabled: boolean, onBackspace: () => void) {
  const run = useEffectEvent(onBackspace);
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Backspace" || !isPlainKey(event) || isTypingTarget(event.target)) return;
      event.preventDefault();
      run();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

/** Registers one window keydown listener that always sees the latest handler. */
export function useWindowKeyDown(handler: (event: KeyboardEvent) => void) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isPlainKey(event) && !event.isComposing) handler(event);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
