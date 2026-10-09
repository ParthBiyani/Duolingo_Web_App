import { expect, test } from "./support/fixtures";
import { startActiveLesson } from "./support/lesson";

test.describe("streak", () => {
  test("the first lesson of the next day extends the streak", async ({ page, api }) => {
    // Today's lesson (through the API) makes it 13; tomorrow's lesson should make it 14.
    const node = await api.activeNode();
    expect(node.next_lesson_id).not.toBeNull();
    const today = await api.completeLesson(node.next_lesson_id ?? 0);
    expect(today.streak).toMatchObject({ extended: true, current: 13 });

    await api.advanceDays(1);
    await page.goto("/learn");
    await expect(page.getByRole("button", { name: "Streak: 13 days" })).toBeVisible();

    const lesson = await startActiveLesson(page);
    await lesson.playToEnd();
    await expect(lesson.completeHeading).toHaveText("Lesson complete!");
    await lesson.continueButton.click();

    await expect(page.getByText("day streak", { exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("14");
    await expect(page.locator("main")).toContainText("That's 14 days in a row!");
    await lesson.finishCelebrations();

    await expect(page.getByRole("button", { name: "Streak: 14 days" })).toBeVisible();
    const me = await api.me();
    expect(me.stats.streak).toMatchObject({ current: 14, extended_today: true, freezes: 1 });
  });

  test("a streak freeze covers a missed day", async ({ page, api }) => {
    // The streak last grew yesterday, so jumping a day ahead misses one day: the freeze covers it.
    await api.advanceDays(1);
    await page.goto("/learn");
    await expect(page.getByRole("button", { name: "Streak: 12 days" })).toBeVisible();

    const lesson = await startActiveLesson(page);
    await lesson.playToEnd();
    await lesson.continueButton.click();
    await expect(page.getByText("day streak", { exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("13");
    await lesson.finishCelebrations();

    const me = await api.me();
    expect(me.stats.streak).toMatchObject({ current: 13, extended_today: true, freezes: 0 });
  });

  test("missing more days than the freezes cover starts the streak over", async ({ page, api }) => {
    // Two more days off with a single freeze: the streak is lost.
    await api.advanceDays(2);
    await page.goto("/learn");
    await expect(page.getByRole("button", { name: "Streak: 0 days" })).toBeVisible();

    const lesson = await startActiveLesson(page);
    await lesson.playToEnd();
    await lesson.continueButton.click();
    await expect(page.getByText("day streak", { exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("You started a streak!");
    await lesson.finishCelebrations();

    await expect(page.getByRole("button", { name: "Streak: 1 day" })).toBeVisible();
    const me = await api.me();
    expect(me.stats.streak).toMatchObject({ current: 1, freezes: 0 });
  });
});
