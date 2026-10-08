"use client";

import { useEffect, useSyncExternalStore } from "react";

import { strings } from "@/content/strings";

import { Button } from "./button";
import { cn } from "./cn";

export type ToastTone = "info" | "success" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Reusing an id replaces that toast instead of stacking a new one. */
  id?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss; Infinity keeps it until dismissed. */
  duration?: number;
  action?: ToastAction;
}

interface ToastRecord {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
  action?: ToastAction;
  /** Bumped when a toast is shown again, which restarts its timer. */
  version: number;
  leaving: boolean;
}

const DEFAULT_DURATION_MS = 4000;
const ACTION_DURATION_MS = 6000;
const EXIT_DURATION_MS = 150;
const MAX_VISIBLE = 3;

// A tiny module-level store: toast() can be called from anywhere, including
// mutation callbacks outside React, and <Toaster> subscribes to it.
let toasts: readonly ToastRecord[] = [];
let sequence = 0;
const listeners = new Set<() => void>();

function setToasts(next: readonly ToastRecord[]) {
  toasts = next;
  listeners.forEach((listener) => listener());
}

function showToast(message: string, options: ToastOptions = {}): string {
  sequence += 1;
  const id = options.id ?? `toast-${sequence}`;
  const record: ToastRecord = {
    id,
    message,
    tone: options.tone ?? "info",
    duration: options.duration ?? (options.action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS),
    action: options.action,
    version: sequence,
    leaving: false,
  };
  setToasts([...toasts.filter((item) => item.id !== id), record].slice(-MAX_VISIBLE));
  return id;
}

/** Dismisses one toast, or all of them when no id is given. */
function dismissToast(id?: string) {
  const matches = (item: ToastRecord) => id === undefined || item.id === id;
  setToasts(toasts.map((item) => (matches(item) ? { ...item, leaving: true } : item)));
  // Remove after the exit animation; a toast re-shown meanwhile is not leaving, so it stays.
  setTimeout(
    () => setToasts(toasts.filter((item) => !(item.leaving && matches(item)))),
    EXIT_DURATION_MS,
  );
}

/** Shows a toast at the bottom centre. Returns its id. */
export const toast = Object.assign(showToast, {
  success: (message: string, options?: Omit<ToastOptions, "tone">) =>
    showToast(message, { ...options, tone: "success" }),
  error: (message: string, options?: Omit<ToastOptions, "tone">) =>
    showToast(message, { ...options, tone: "error" }),
  dismiss: dismissToast,
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => toasts;
const NO_TOASTS: readonly ToastRecord[] = [];
const getServerSnapshot = () => NO_TOASTS;

/** Renders the toast stack; mount it once, near the root. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <div className="ui-toaster" aria-live="polite">
      {items.map((item) => (
        <ToastView key={item.id} item={item} />
      ))}
    </div>
  );
}

function ToastView({ item }: { item: ToastRecord }) {
  const { id, duration, leaving, version, action } = item;

  useEffect(() => {
    if (leaving || !Number.isFinite(duration)) return;
    const timer = window.setTimeout(() => dismissToast(id), duration);
    return () => window.clearTimeout(timer);
  }, [id, duration, leaving, version]);

  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      className={cn("ui-toast", `ui-toast-${item.tone}`)}
      data-leaving={leaving || undefined}
    >
      <span className="ui-toast-dot" aria-hidden="true" />
      <p className="min-w-0 flex-1 py-1">{item.message}</p>
      {action ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            action.onClick();
            dismissToast(id);
          }}
        >
          {action.label}
        </Button>
      ) : null}
      <button
        type="button"
        aria-label={strings.common.dismiss}
        onClick={() => dismissToast(id)}
        className="grid size-8 shrink-0 place-items-center rounded-full text-disabled hover:bg-surface-hover hover:text-muted"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M1 1l10 10M11 1L1 11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
