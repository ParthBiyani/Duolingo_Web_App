import { expect, test } from "./support/fixtures";

test.describe("quests", () => {
  test("the daily goal quest fills up with each lesson and completes", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    await page.goto("/quests");
    await expect(page.getByRole("heading", { level: 1, name: "Quests" })).toBeAttached();
    await expect(page.getByRole("heading", { name: "Welcome!" })).toBeVisible();
    const daily = page.getByRole("region", { name: "Daily Quests" });
    await expect(daily.getByText("Earn 20 XP", { exact: true })).toBeVisible();
    await expect(daily.getByRole("progressbar", { name: "Earn 20 XP: 0 of 20" })).toBeVisible();
    // Quests refresh at the learner's midnight: the time left is counted in hours (or minutes).
    await expect(daily).toContainText(/\d+ (hours?|minutes?)/i);
    await expect(page.getByText("More quests unlock soon")).toBeVisible();
    // The quests page swaps the rail's cards for the monthly challenge.
    const rail = page.getByRole("complementary", { name: "Progress and offers" });
    await expect(
      rail.getByRole("heading", { name: "Monthly challenges unlock soon!" }),
    ).toBeVisible();
    await expectNoA11yViolations();

    // One perfect lesson is 15 XP: three quarters of the goal.
    const first = await api.activeNode();
    await api.completeLesson(first.next_lesson_id ?? 0);
    await page.reload();
    await expect(daily.getByRole("progressbar", { name: "Earn 20 XP: 15 of 20" })).toBeVisible();
    await expect(daily.getByRole("img", { name: "Reward: 5 gems" })).toBeVisible();

    // A second lesson passes the goal: the bar stops at the target and the chest is open.
    const second = await api.activeNode();
    await api.completeLesson(second.next_lesson_id ?? 0);
    await page.reload();
    await expect(daily.getByRole("progressbar", { name: "Earn 20 XP: 20 of 20" })).toBeVisible();
    await expect(daily.getByRole("img", { name: "Completed" })).toBeVisible();
  });

  test("the rail's quest card follows the daily goal and links to the quests", async ({ page }) => {
    await page.goto("/learn");
    const rail = page.getByRole("complementary", { name: "Progress and offers" });
    await expect(rail.getByRole("heading", { name: "Daily Quests" })).toBeVisible();
    await expect(rail.getByRole("progressbar", { name: "Earn 20 XP" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    await rail.getByRole("link", { name: /^view all$/i }).click();
    await expect(page).toHaveURL(/\/quests$/);
  });
});
