import { afterEach, describe, expect, it, vi } from "vitest";

import { isTheme, resolveTheme, THEME_STORAGE_KEY, themeInitScript } from "./theme";

function runInitScript() {
  // The script is plain ES5 meant for an inline <script>; evaluate it the same way.
  new Function(themeInitScript)();
  return document.documentElement.dataset.theme;
}

function mockColorScheme(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: prefersDark && query.includes("dark"), media: query })),
  );
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

describe("resolveTheme", () => {
  it("keeps explicit choices and follows the OS for system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("isTheme", () => {
  it("accepts only known preferences", () => {
    expect(isTheme("system")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe("themeInitScript", () => {
  it("paints the cached preference", () => {
    mockColorScheme(false);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(runInitScript()).toBe("dark");
  });

  it("follows the OS when the preference is system or missing", () => {
    mockColorScheme(true);
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    expect(runInitScript()).toBe("dark");

    localStorage.clear();
    mockColorScheme(false);
    expect(runInitScript()).toBe("light");
  });
});
