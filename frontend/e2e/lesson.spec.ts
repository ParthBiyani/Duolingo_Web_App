import { expect, test } from "./support/fixtures";
import { horizontalOverflow } from "./support/layout";
import { startActiveLesson } from "./support/lesson";
import { correctAnswer } from "./support/oracle";

/** Light-theme feedback bar colours (design tokens --feedback-wrong-bg / --feedback-correct-bg). */
const WRONG_BAR = "rgb(255, 223, 224)";
const CORRECT_BAR = "rgb(215, 255, 184)";

test.describe("lesson", () => {
  test("a finished lesson celebrates XP, streak and the daily goal, then returns to the path", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    // A 10 XP goal is met by one lesson, so the goal and chest screens are part of the run.
    await api.setDailyGoal(10);
    const weekXpBefore = (await api.leaderboard()).rows.find((row) => row.is_me)?.xp ?? 0;
    const node = await api.activeNode();

    const lesson = await startActiveLesson(page);
    await expectNoA11yViolations();
    await lesson.playToEnd();

    // 1. Lesson complete: every answer right first time is 10 XP plus the full 5 XP combo bonus.
    const main = page.locator("main");
    await expect(lesson.completeHeading).toHaveText("Lesson complete!");
    await expect(main).toContainText(/total xp\s*15/i);
    await expect(main).toContainText("100%");
    await expectNoA11yViolations();
    await lesson.continueButton.click();

    // 2. The first lesson of the day extends the 12-day streak.
    await expect(page.getByText("day streak", { exact: true })).toBeVisible();
    await expect(main).toContainText("13");
    await expect(main).toContainText("That's 13 days in a row!");
    await expectNoA11yViolations();
    await lesson.continueButton.click();

    // 3. The daily goal is reached and 4. its chest pays out.
    await expect(page.getByRole("heading", { name: "Daily goal complete!" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Earn 10 XP" })).toBeVisible();
    await lesson.continueButton.click();
    await expect(page.getByRole("heading", { name: "You earned 5 gems!" })).toBeVisible();
    await expectNoA11yViolations();

    // 5. Any achievement levels reached, then back to the path, where the level just played pops.
    await lesson.finishCelebrations();
    await expect(page).toHaveURL(new RegExp(`/learn\\?done=${node.id}$`));

    // The new XP and streak show on the path.
    await expect(page.getByRole("button", { name: "Streak: 13 days" })).toBeVisible();
    await expect(page.getByText(`You've earned ${weekXpBefore + 15} XP this week`)).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Earn 10 XP" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    await expect(
      page.getByRole("button", { name: "My day, current level, lesson 3 of 3" }),
    ).toBeVisible();
  });

  test("a wrong answer shows the solution in red, costs a heart and comes back later", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    const lesson = await startActiveLesson(page);
    await expect(lesson.hearts(10)).toBeAttached();

    const missedId = await lesson.exerciseId();
    const answer = correctAnswer(missedId);
    expect(answer.kind, "the lesson opens with a choice exercise").toBe("option");
    const solution = answer.kind === "option" ? answer.option.text : "";

    const feedback = await lesson.answerWrongly();
    expect(feedback?.correct).toBe(false);
    await expect(lesson.feedbackBar).toContainText("Correct solution:");
    await expect(lesson.feedbackBar).toContainText(solution);
    await expect(page.locator("footer > div").first()).toHaveCSS("background-color", WRONG_BAR);
    await expect(lesson.hearts(9)).toBeAttached();
    await expectNoA11yViolations();
    await lesson.continueAfterFeedback();

    // The missed exercise is asked again at the end, flagged as a previous mistake.
    let reasked = false;
    await lesson.playToEnd({
      onExercise: async (id) => {
        if (id !== missedId) return;
        reasked = true;
        await expect(page.getByText("Previous mistake", { exact: true })).toBeVisible();
      },
    });
    expect(reasked, "the missed exercise came back").toBe(true);
    await expect(lesson.completeHeading).toHaveText("Lesson complete!");
    await expect(page.locator("main")).toContainText("90%");
    expect((await api.me()).stats.hearts, "hearts after the lesson").toBe(9);
  });

  test("a right answer shows praise in green", async ({ page }) => {
    const lesson = await startActiveLesson(page);
    const feedback = await lesson.answerCorrectly();
    expect(feedback?.correct).toBe(true);
    await expect(page.locator("footer > div").first()).toHaveCSS("background-color", CORRECT_BAR);
    await expect(lesson.hearts(10)).toBeAttached();
    await lesson.continueAfterFeedback();
    await expect(page.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute(
      "aria-valuenow",
      "10",
    );
  });

  test("the quit dialog keeps learning or ends the session", async ({
    page,
    expectNoA11yViolations,
  }) => {
    const lesson = await startActiveLesson(page);
    const firstId = await lesson.exerciseId();

    await lesson.quitButton.click();
    const dialog = page.getByRole("dialog", { name: "Hold on! Leaving already?" });
    await expect(dialog).toBeVisible();
    await expectNoA11yViolations();
    await dialog.getByRole("button", { name: /^keep learning$/i }).click();
    await expect(dialog).toBeHidden();
    expect(await lesson.exerciseId()).toBe(firstId);

    // Escape asks again; ending the session goes back to the path without progress.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^end session$/i }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(
      page.getByRole("button", { name: "My day, current level, lesson 2 of 3" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Streak: 12 days" })).toBeVisible();
  });
});

test.describe("lesson on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("plays through to the results", async ({ page, expectNoA11yViolations }) => {
    const lesson = await startActiveLesson(page);
    // Lessons run full screen: no tab bar, just the header, the exercise and the footer.
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    await expectNoA11yViolations();
    await lesson.playToEnd({
      onExercise: async () => {
        // Every exercise fits the width, with CHECK on screen without scrolling.
        await expect(lesson.checkButton).toBeInViewport();
        expect(await horizontalOverflow(page, "main"), "sideways overflow").toBeLessThanOrEqual(0);
      },
    });
    await expect(lesson.completeHeading).toHaveText("Lesson complete!");
    await expect(lesson.continueButton).toBeInViewport();
    await lesson.finishCelebrations();
    await expect(page.getByRole("button", { name: "Streak: 13 days" })).toBeVisible();
  });
});
