/**
 * Theme helpers shared by the root layout (a Server Component, which inlines
 * the no-flash script) and the client ThemeProvider. Keep this module free of
 * React client APIs so both can import it.
 */
import type { Theme } from "@/lib/api/types";

export type ResolvedTheme = "light" | "dark";

/** localStorage key caching the learner's theme preference between visits. */
export const THEME_STORAGE_KEY = "theme";

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

/** Turns a preference into the palette to paint; "system" follows the OS. */
export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the server value still applies.
  }
}

/** Subscribes to changes of the stored preference made in other tabs. */
export function subscribeToStoredTheme(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function prefersDarkScheme(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

export function subscribeToColorScheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Sets `data-theme` on <html>; the token blocks and the `dark:` variant key on it. */
export function applyTheme(resolved: ResolvedTheme, root: HTMLElement = document.documentElement) {
  root.dataset.theme = resolved;
}

/** Sets `data-animations` on <html>; globals.css stops motion when it is "off". */
export function applyAnimations(enabled: boolean, root: HTMLElement = document.documentElement) {
  root.dataset.animations = enabled ? "on" : "off";
}

/**
 * Inline script for the root layout's <head>. It runs while the HTML is being
 * parsed, before the first paint, so a returning dark-theme learner never sees
 * a light flash. Once /me loads, the server's preference wins (see Providers).
 */
export const themeInitScript = `(function(){var r=document.documentElement;try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark"){t=window.matchMedia(${JSON.stringify(
  DARK_SCHEME_QUERY,
)}).matches?"dark":"light"}r.dataset.theme=t}catch(e){r.dataset.theme="light"}})();`;
