import type { Page } from "@playwright/test";

import type { Api } from "./support/api";
import { expect, test } from "./support/fixtures";
import { LessonPage, startActiveLesson } from "./support/lesson";
import { wrongAnswer } from "./support/oracle";

/** Hearts are capped at ten; every sample learner starts with all of them. */
const MAX_HEARTS = 10;
const HOUR = 60 * 60;

/** Answers wrongly until the hearts run out; returns the out-of-hearts dialog. */
async function runOutOfHearts(page: Page, lesson: LessonPage) {
  const dialog = page.getByRole("dialog", { name: "You're out of hearts!" });
  for (let guard = 0; guard < 40; guard += 1) {
    const step = await lesson.nextStep();
    if (step === "dialog") break;
    if (step === "celebration") throw new Error("the lesson ended before the hearts ran out");
    if (step === "interstitial") {
      await lesson.continueButton.click();
      continue;
    }
    const hearts = await lesson.heartCount();
    if (wrongAnswer(await lesson.exerciseId()) === null) {
      await lesson.answerCorrectly(); // "Can't speak now" is never a mistake
      continue;
    }
    const feedback = await lesson.answerWrongly();
    await expect(lesson.hearts(hearts - 1)).toBeAttached();
    if (feedback !== null) {
      expect(feedback.correct).toBe(false);
      await lesson.continueAfterFeedback();
    }
  }
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Leaves the learner `left` hearts (spent through the API), then starts the next lesson. */
async function startLessonWithHearts(page: Page, api: Api, left: number): Promise<LessonPage> {
  const node = await api.activeNode();
  expect(await api.loseHearts(node.next_lesson_id ?? 0, MAX_HEARTS - left)).toBe(left);
  const lesson = await startActiveLesson(page);
  await expect(lesson.hearts(left)).toBeAttached();
  return lesson;
}

test.describe("hearts", () => {
  test("each wrong answer costs a heart until the out-of-hearts dialog", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    // Eight hearts go through the API; the last two are lost in the lesson.
    const lesson = await startLessonWithHearts(page, api, 2);

    const dialog = await runOutOfHearts(page, lesson);
    await expect(lesson.hearts(0)).toBeAttached();
    await expect(dialog).toContainText(
      "Refill your hearts to keep going, or practice to earn one back.",
    );
    // Unlimited hearts are coming soon; the other three choices work.
    await expect(dialog.getByRole("button", { name: /unlimited hearts/i })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: /refill hearts/i })).toBeEnabled();
    await expect(dialog.getByRole("button", { name: /practice to earn hearts/i })).toBeEnabled();
    await expectNoA11yViolations();
    // It cannot be dismissed without choosing.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    // 450 gems from inside a lesson (the learner has 500), for all ten hearts.
    await dialog.getByRole("button", { name: /refill hearts/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Hearts refilled! Back to it.")).toBeVisible();
    await expect(lesson.hearts(MAX_HEARTS)).toBeAttached();
    await expect(lesson.exercise).toBeVisible();

    const me = await api.me();
    expect(me.stats.hearts).toBe(MAX_HEARTS);
    expect(me.stats.gems).toBe(50);
  });

  test("practising after running out of hearts earns one back", async ({ page, api }) => {
    const lesson = await startLessonWithHearts(page, api, 1);
    const dialog = await runOutOfHearts(page, lesson);

    await dialog.getByRole("button", { name: /practice to earn hearts/i }).click();
    await expect(page).toHaveURL(/\/practice$/);
    const practice = new LessonPage(page);
    await practice.waitForExercise();
    await expect(practice.hearts(0)).toBeAttached();

    await practice.playToEnd();
    await expect(practice.completeHeading).toHaveText("Practice complete!");
    await expect(page.locator("main")).toContainText("+1 heart");
    await practice.finishCelebrations();

    await expect(page.getByRole("button", { name: "Hearts: 1" })).toBeVisible();
    expect((await api.me()).stats.hearts).toBe(1);
  });

  test("saying no thanks leaves the lesson with no hearts", async ({ page, api }) => {
    const lesson = await startLessonWithHearts(page, api, 1);
    const dialog = await runOutOfHearts(page, lesson);

    await dialog.getByRole("button", { name: /^no thanks$/i }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole("button", { name: "Hearts: 0" })).toBeVisible();
  });

  test("hearts come back one every five hours", async ({ page, api }) => {
    const node = await api.activeNode();
    await api.loseHearts(node.next_lesson_id ?? 0, 1);

    await page.goto("/learn");
    await page.getByRole("button", { name: "Hearts: 9" }).click();
    await expect(page.getByRole("dialog")).toContainText(/Next heart in 4:5\d:\d\d/);
    await expect(page.getByRole("dialog")).toContainText(
      "You still have hearts left! Keep on learning",
    );

    await api.advanceClock(5 * HOUR);
    await page.reload();
    await page.getByRole("button", { name: "Hearts: 10" }).click();
    await expect(page.getByRole("dialog")).toContainText("You have full hearts");
  });

  test("demo time refills an empty heart bar one heart per five hours", async ({ page, api }) => {
    const node = await api.activeNode();
    await api.loseAllHearts(node.next_lesson_id ?? 0);

    await page.goto("/settings/preferences");
    await expect(page.getByRole("button", { name: "Hearts: 0" })).toBeVisible();
    const demo = page.getByRole("region", { name: "Demo tools" });
    const fiveHours = demo.getByRole("button", { name: "+5 hours" });

    await fiveHours.click();
    await expect(page.getByText("Clock moved: +5 hours")).toBeVisible();
    await expect(page.getByRole("button", { name: "Hearts: 1" })).toBeVisible();
    await fiveHours.click();
    await expect(page.getByRole("button", { name: "Hearts: 2" })).toBeVisible();
    await expect(demo.getByText("+10 hours", { exact: true })).toBeVisible();

    // The next heart is a full five hours after the last one, on the moved clock.
    await page.getByRole("button", { name: "Hearts: 2" }).click();
    await expect(page.getByRole("dialog")).toContainText(/Next heart in 4:5\d:\d\d/);
    expect((await api.me()).stats.hearts).toBe(2);

    // With hearts back, the next lesson starts without the out-of-hearts dialog.
    const lesson = await startActiveLesson(page);
    await expect(lesson.hearts(2)).toBeAttached();
    await expect(lesson.dialog).toHaveCount(0);
  });
});

test.describe("hearts when none are left", () => {
  // The API refuses to start a lesson without hearts (409), and the browser logs that response.
  test.use({ allowedConsoleErrors: [/status of 409/] });

  test("starting a lesson offers a refill, then the lesson begins", async ({ page, api }) => {
    const node = await api.activeNode();
    await api.loseAllHearts(node.next_lesson_id ?? 0);

    await page.goto("/learn");
    await expect(page.getByRole("button", { name: "Hearts: 0" })).toBeVisible();
    await page.getByRole("button", { name: /, current level,/ }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: /^start \+10 xp$/i })
      .click();

    const dialog = page.getByRole("dialog", { name: "You're out of hearts!" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /refill hearts/i }).click();
    await expect(dialog).toBeHidden();

    const lesson = new LessonPage(page);
    await lesson.waitForExercise();
    await expect(lesson.hearts(MAX_HEARTS)).toBeAttached();
    expect((await api.me()).stats.gems).toBe(50);
  });

  test.describe("for a learner short of gems", () => {
    test.use({ learner: "ishanair" });

    test("the refill says how many gems are missing", async ({ page, api }) => {
      // Isha has 320 gems: 130 short of the 450-gem refill inside a lesson.
      const node = await api.activeNode();
      await api.loseAllHearts(node.next_lesson_id ?? 0);

      await page.goto(`/lesson/${node.next_lesson_id}`);
      const dialog = page.getByRole("dialog", { name: "You're out of hearts!" });
      await expect(dialog).toBeVisible();
      const refill = dialog.getByRole("button", { name: /refill hearts/i });
      await expect(refill).toBeDisabled();
      await expect(refill).toContainText("You need 130 more gems");

      await dialog.getByRole("button", { name: /^no thanks$/i }).click();
      await expect(page).toHaveURL(/\/learn$/);
      expect((await api.me()).stats).toMatchObject({ hearts: 0, gems: 320 });
    });
  });
});
