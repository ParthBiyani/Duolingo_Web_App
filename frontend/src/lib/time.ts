"use client";

// Client module: it creates the server-clock context and the ticking hook.
import { createContext, useContext, useSyncExternalStore } from "react";

import { strings } from "@/content/strings";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Milliseconds to add to the browser clock to get the server clock. The server
 * clock can run ahead of real time (Demo tools), so every countdown that ends
 * at a server timestamp must be measured against server time, not Date.now().
 */
export const ServerClockContext = createContext(0);

/** Offset between a response's `server_now` and the moment it was received. */
export function computeClockOffset(serverNow: string, receivedAt: number): number {
  const serverTime = Date.parse(serverNow);
  return Number.isFinite(serverTime) ? serverTime - receivedAt : 0;
}

/** Reads `server_now` from an API payload, if it carries one. */
export function readServerNow(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("server_now" in payload)) return null;
  const value = (payload as { server_now: unknown }).server_now;
  return typeof value === "string" ? value : null;
}

// One shared ticker for every mounted countdown, aligned to whole seconds.
const tickListeners = new Set<() => void>();
let tickTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleTick() {
  tickTimer = setTimeout(
    () => {
      tickListeners.forEach((listener) => listener());
      scheduleTick();
    },
    SECOND - (Date.now() % SECOND),
  );
}

function subscribeToTicks(listener: () => void): () => void {
  tickListeners.add(listener);
  if (tickTimer === undefined) scheduleTick();
  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size === 0 && tickTimer !== undefined) {
      clearTimeout(tickTimer);
      tickTimer = undefined;
    }
  };
}

/** The current second; stable between ticks, as useSyncExternalStore requires. */
function currentSecond(): number {
  return Math.floor(Date.now() / SECOND) * SECOND;
}

/** The server-clock offset in milliseconds (see ServerClockContext). */
export function useServerOffset(): number {
  return useContext(ServerClockContext);
}

/** Server time in epoch milliseconds, re-rendering the caller once per second. */
export function useServerNow(): number {
  const offset = useServerOffset();
  const now = useSyncExternalStore(subscribeToTicks, currentSecond, currentSecond);
  return now + offset;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Formats a remaining duration as a clock: "mm:ss" under an hour, "h:mm:ss"
 * above. Seconds round up so the display reaches 00:00 exactly at expiry.
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / SECOND)) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Coarse time left, as shown on league and quest cards: "3 days", "5 hours", "12 minutes". */
export function formatTimeLeft(ms: number): string {
  const remaining = Math.max(0, ms);
  if (remaining >= DAY) return strings.time.days(Math.floor(remaining / DAY));
  if (remaining >= HOUR) return strings.time.hours(Math.floor(remaining / HOUR));
  return strings.time.minutes(Math.max(1, Math.ceil(remaining / MINUTE)));
}
