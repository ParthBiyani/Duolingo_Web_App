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
