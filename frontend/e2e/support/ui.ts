/** Small UI checks shared by the specs. */
import { expect, type Page } from "@playwright/test";

/**
 * Waits for the "Coming soon" toast that placeholder features show, then dismisses it so the
 * next one can be told apart.
 */
export async function expectComingSoon(page: Page): Promise<void> {
  const toast = page.getByRole("status").filter({ hasText: /^coming soon$/i });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Dismiss" }).click();
  await expect(toast).toHaveCount(0);
}

/** The app's toast with exactly this text (success and info toasts are status messages). */
export function toastWith(page: Page, text: string | RegExp) {
  return page.getByRole("status").filter({ hasText: text });
}

/**
 * Settings pages show the settings cards instead of the top bar stats and right rail (as on the
 * original), so checks on those run in a second tab on the path, in the same session.
 */
export async function onLearnPage(
  page: Page,
  check: (learn: Page) => Promise<void>,
): Promise<void> {
  const learn = await page.context().newPage();
  try {
    await learn.goto("/learn");
    await check(learn);
  } finally {
    await learn.close();
  }
}

/** Expects a top bar stat ("Streak: 12 days", "Hearts: 3") on the path, from a settings page. */
export function expectStat(page: Page, name: string): Promise<void> {
  return onLearnPage(page, (learn) => expect(learn.getByRole("button", { name })).toBeVisible());
}
