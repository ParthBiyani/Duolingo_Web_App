import type { Page } from "@playwright/test";

import { expect, test } from "./support/fixtures";
import { expectComingSoon, toastWith } from "./support/ui";

/**
 * The stats (course, streak, XP, gems, hearts) open their popovers while the mouse hovers them,
 * as on Duolingo; a click keeps them open. This opens one by clicking its stat.
 */
async function openStat(page: Page, name: string | RegExp) {
  await page.getByRole("group", { name: "Your stats" }).getByRole("button", { name }).click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  return panel;
}

/** Moves the mouse off the stat and presses Escape: the panel closes. */
async function closeStat(page: Page) {
  await page.mouse.move(1, 1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.describe("top bar popovers", () => {
  test("the course flag lists the course and offers more as coming soon", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");
    const panel = await openStat(page, /^Course: /);
    await expect(panel.getByRole("heading", { name: "My courses" })).toBeVisible();
    await expect(panel).toContainText("Spanish");
    await expectNoA11yViolations();
    await panel.getByRole("button", { name: /add a new course/i }).click();
    await expectComingSoon(page);
  });

  test("the streak shows the week, the freezes and what to do today", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");
    const panel = await openStat(page, "Streak: 12 days");
    await expect(panel.getByRole("heading", { name: "12 day streak" })).toBeVisible();
    await expect(panel).toContainText("Do a lesson today to extend your streak!");
    await expect(panel).toContainText("1 streak freeze equipped");
    // Seven days, today among them; the streak last grew yesterday.
    await expect(panel.getByRole("listitem")).toHaveCount(7);
    await expect(panel.getByText(/: today$/)).toHaveCount(1);
    await expect(panel.getByText(/: streak extended$/).first()).toBeAttached();
    await expectNoA11yViolations();

    await panel.getByRole("button", { name: /^view list$/i }).click();
    await expectComingSoon(page);
  });

  test("the streak's View more opens the calendar, the goal and the society", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");
    const panel = await openStat(page, "Streak: 12 days");
    await panel.getByRole("button", { name: /^view more$/i }).click();

    const modal = page.getByRole("dialog", { name: "Streak" });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("tab", { name: "Personal" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(modal.getByText("12 day streak").first()).toBeVisible();
    // A month calendar that can go back to when the learner started, but not into the future.
    await expect(modal.getByRole("heading", { name: "Calendar" })).toBeVisible();
    // The disabled arrow is also hidden, as on the original.
    await expect(
      modal.getByRole("button", { name: "Next month", includeHidden: true }),
    ).toBeDisabled();
    await expect(modal.getByRole("button", { name: "Previous month" })).toBeEnabled();
    const goal = modal.getByRole("progressbar", { name: "Streak Goal" });
    await expect(goal).toHaveAttribute("aria-valuetext", /^12 of \d+ days$/);
    // Twelve days in a row: a member of the Streak Society.
    await expect(modal).toContainText(
      "You're a member of the Streak Society! Exclusive rewards are coming soon.",
    );
    await expectNoA11yViolations();

    await modal.getByRole("button", { name: "Previous month" }).click();
    await expect(modal.getByRole("button", { name: "Next month" })).toBeEnabled();

    await modal.getByRole("tab", { name: "Friends" }).click();
    await expect(modal.getByRole("tab", { name: "Friends" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(modal).toContainText("Friend Streaks");

    await modal.getByRole("button", { name: "Close" }).click();
    await expect(modal).toBeHidden();
  });

  test("the streak flame lights up once today's lesson is done", async ({ page, api }) => {
    const node = await api.activeNode();
    await api.completeLesson(node.next_lesson_id ?? 0);
    await page.goto("/learn");
    const panel = await openStat(page, "Streak: 13 days");
    await expect(panel.getByRole("heading", { name: "13 day streak" })).toBeVisible();
    await expect(panel).toContainText("You extended your streak today. Nice work!");
    await expect(panel.getByText(/: today$/)).toHaveCount(0);
  });

  test("XP shows the total and the daily goal, and links to the goal setting", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");
    const panel = await openStat(page, "Total XP: 1,240");
    await expect(panel.getByRole("heading", { name: "1,240 XP" })).toBeVisible();
    await expect(panel.getByRole("progressbar", { name: "Daily goal: 0 of 20 XP" })).toBeVisible();
    await expect(panel).toContainText("Earn 20 more XP to reach today's goal.");
    await expectNoA11yViolations();

    await panel.getByRole("link", { name: /^change daily goal$/i }).click();
    await expect(page).toHaveURL(/\/settings\/preferences$/);
    // The link closes the popover, although the mouse is still over where it was.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Daily goal" })).toHaveValue("20");
  });

  test("gems show the balance and lead to the shop", async ({ page, expectNoA11yViolations }) => {
    await page.goto("/learn");
    const panel = await openStat(page, "Gems: 500");
    await expect(panel.getByRole("heading", { name: "Gems" })).toBeVisible();
    await expect(panel).toContainText("You have 500 gems");
    await expectNoA11yViolations();

    await panel.getByRole("link", { name: /^go to shop$/i }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("hearts show ten full hearts and their options", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");
    const panel = await openStat(page, "Hearts: 10");
    await expect(panel.getByRole("heading", { name: "Hearts" })).toBeVisible();
    await expect(panel).toContainText("You have full hearts");
    await expect(panel).toContainText("Keep on learning");
    // A full bar cannot be refilled.
    await expect(panel.getByRole("button", { name: /refill hearts/i })).toBeDisabled();
    await expectNoA11yViolations();

    await panel.getByRole("button", { name: /unlimited hearts/i }).click();
    await expectComingSoon(page);
    await closeStat(page);

    const again = await openStat(page, "Hearts: 10");
    await again.getByRole("link", { name: /practice to earn hearts/i }).click();
    await expect(page).toHaveURL(/\/practice$/);
  });

  test("hearts can be refilled from the popover for 350 gems", async ({ page, api }) => {
    const node = await api.activeNode();
    await api.loseAllHearts(node.next_lesson_id ?? 0);

    await page.goto("/learn");
    const panel = await openStat(page, "Hearts: 0");
    await expect(panel).toContainText("Next heart in");
    await expect(panel).toContainText("Refill your hearts or practice to earn one back.");
    await panel.getByRole("button", { name: /refill hearts/i }).click();
    await expect(toastWith(page, "Hearts refilled!")).toBeVisible();
    await expect(page.getByRole("button", { name: "Hearts: 10" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gems: 150" })).toBeVisible();
    expect((await api.me()).stats).toMatchObject({ hearts: 10, gems: 150 });
  });

  test("hovering a stat opens its popover and leaving closes it", async ({ page }) => {
    await page.goto("/learn");
    const stats = page.getByRole("group", { name: "Your stats" });
    await stats.getByRole("button", { name: "Gems: 500" }).hover();
    await expect(page.getByRole("dialog")).toContainText("You have 500 gems");
    await page.mouse.move(1, 1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
