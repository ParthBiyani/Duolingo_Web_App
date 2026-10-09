import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./support/fixtures";
import { startActiveLesson } from "./support/lesson";

/** The panel's "Clock offset" value ("Real time", "+1 day", ...). */
function clockOffset(demo: Locator): Locator {
  return demo.getByRole("definition").nth(1);
}

/** Settings → Demo tools: the panel that moves the server's simulated clock. */
async function openDemoTools(page: Page) {
  await page.goto("/settings/preferences");
  const demo = page.getByRole("region", { name: "Demo tools" });
  await expect(clockOffset(demo)).toHaveText("Real time");
  return demo;
}

test.describe("demo tools", () => {
  test("+1 day, then a lesson, extends the streak", async ({ page, api }) => {
    // Today's lesson makes the streak 13 ...
    const node = await api.activeNode();
    await api.completeLesson(node.next_lesson_id ?? 0);

    const demo = await openDemoTools(page);
    await expect(page.getByRole("button", { name: "Streak: 13 days" })).toBeVisible();
    // ... and tomorrow it still stands, waiting for the day's lesson.
    await demo.getByRole("button", { name: "+1 day" }).click();
    await expect(page.getByText("Clock moved: +1 day")).toBeVisible();
    await expect(clockOffset(demo)).toHaveText("+1 day");
    await expect(page.getByRole("button", { name: "Streak: 13 days" })).toBeVisible();
    expect((await api.me()).stats.streak).toMatchObject({ current: 13, extended_today: false });

    const lesson = await startActiveLesson(page);
    await lesson.playToEnd();
    await lesson.continueButton.click();
    await expect(page.getByText("day streak", { exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("That's 14 days in a row!");
    await lesson.finishCelebrations();
    await expect(page.getByRole("button", { name: "Streak: 14 days" })).toBeVisible();
  });

  test("+1 hour moves the clock shown in the panel", async ({ page }) => {
    const demo = await openDemoTools(page);
    await demo.getByRole("button", { name: "+1 hour" }).click();
    await expect(page.getByText("Clock moved: +1 hour")).toBeVisible();
    await expect(clockOffset(demo)).toHaveText("+1 hour");
  });

  test("Next Monday closes the league week", async ({ page }) => {
    const demo = await openDemoTools(page);
    await demo.getByRole("button", { name: "Next Monday" }).click();
    await expect(page.getByText("Clock moved: Next Monday")).toBeVisible();

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Leaderboards" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/You finished #\d+ last week\./);
    await dialog.getByRole("button", { name: /^continue$/i }).click();
    await expect(dialog).toBeHidden();
  });

  test("reset can be cancelled", async ({ page, api }) => {
    await api.advanceDays(1);
    await page.goto("/settings/preferences");
    const demo = page.getByRole("region", { name: "Demo tools" });
    await demo.getByRole("button", { name: "Reset demo data" }).click();
    const dialog = page.getByRole("dialog", { name: "Reset demo data?" });
    await expect(dialog).toContainText("every sample learner's progress");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await expect(clockOffset(demo)).toHaveText("+1 day");
  });
});
