"use client";

import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { toast, Toaster } from "@/components/ui";
import { strings } from "@/content/strings";
import { createQueryClient, isApiError, useMe, type Theme } from "@/lib/api";
import { setSoundEnabled } from "@/lib/sound";
import {
  applyAnimations,
  applyTheme,
  prefersDarkScheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  subscribeToColorScheme,
  subscribeToStoredTheme,
  type ResolvedTheme,
} from "@/lib/theme";
import { computeClockOffset, readServerNow, ServerClockContext } from "@/lib/time";

export interface ThemeContextValue {
  /** The learner's preference. */
  theme: Theme;
  /** The palette currently painted. */
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "system", resolvedTheme: "light" });

/** The current theme preference and painted palette. Change it with `useUpdateSettings`. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** App-wide providers: data cache, server clock, theme, learner preferences and toasts. */
export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session; useState keeps it stable across renders.
  const [queryClient] = useState(() => createQueryClient({ onUnexpectedError: reportError }));

  return (
    <QueryClientProvider client={queryClient}>
      <ServerClockProvider>
        <ThemeProvider>
          <PreferencesProvider>{children}</PreferencesProvider>
        </ThemeProvider>
      </ServerClockProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

function reportError(error: unknown, key: string, retry?: () => void) {
  const offline = isApiError(error) && error.status === 0;
  const message = offline
    ? strings.errors.network
    : retry
      ? strings.errors.refreshFailed
      : strings.errors.generic;
  toast.error(message, {
    id: key,
    action: retry ? { label: strings.common.retry, onClick: retry } : undefined,
  });
}

/**
 * Keeps the offset between the browser clock and the server clock, taken from
 * the `server_now` of every fetched response. Countdowns read it through
 * useServerNow(), so they stay right when Demo tools move the server clock.
 */
function ServerClockProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        // Only real fetches: a local cache patch keeps the old server_now.
        if (event.type !== "updated" || event.action.type !== "success" || event.action.manual)
          return;
        const serverNow = readServerNow(event.action.data);
        if (serverNow) setOffset(computeClockOffset(serverNow, event.query.state.dataUpdatedAt));
      }),
    [queryClient],
  );

  return <ServerClockContext value={offset}>{children}</ServerClockContext>;
}

/**
 * Applies the theme. The inline script in the root layout has already painted
 * the cached preference; once /me loads, the server's preference wins and is
 * cached for the next visit. "system" follows the OS setting live.
 */
function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const serverTheme = me?.settings.theme;
  const storedTheme = useSyncExternalStore(subscribeToStoredTheme, readStoredTheme, () => null);
  const prefersDark = useSyncExternalStore(subscribeToColorScheme, prefersDarkScheme, () => false);

  const theme = serverTheme ?? storedTheme ?? "system";
  const resolvedTheme = resolveTheme(theme, prefersDark);

  useLayoutEffect(() => {
    // Read live values rather than the hydration snapshots above, which assume a light,
    // storage-less browser and would briefly undo the inline script. Re-applying here also
    // restores the attribute after React's development-only remount clears it.
    applyTheme(resolveTheme(serverTheme ?? readStoredTheme() ?? "system", prefersDarkScheme()));
  }, [serverTheme, storedTheme, prefersDark]);

  useEffect(() => {
    if (serverTheme) storeTheme(serverTheme);
  }, [serverTheme]);

  const value = useMemo(() => ({ theme, resolvedTheme }), [theme, resolvedTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/** Mirrors the Animations and Sound effects settings into CSS, motion and audio. */
function PreferencesProvider({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const animations = me?.settings.animations ?? true;
  const soundEffects = me?.settings.sound_effects ?? true;

  useLayoutEffect(() => {
    applyAnimations(animations);
  }, [animations]);

  useEffect(() => {
    setSoundEnabled(soundEffects);
  }, [soundEffects]);

  return <MotionConfig reducedMotion={animations ? "user" : "always"}>{children}</MotionConfig>;
}
