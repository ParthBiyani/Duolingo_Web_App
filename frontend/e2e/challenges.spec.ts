import { expect, test } from "./support/fixtures";
import { LessonPage } from "./support/lesson";

test.describe("challenges", () => {
  test("timed practice runs against the clock until time is up", async ({
    page,
    expectNoA11yViolations,
  }) => {
    // A controllable clock lets the 30 s timer run out without waiting for it.
    await page.clock.install();
    await page.goto("/practice-hub");
    await expectNoA11yViolations();
    await page.getByRole("link", { name: "Start timed practice" }).click();
    await expect(page).toHaveURL(/\/timed$/);
    const timed = new LessonPage(page);
    await timed.waitForExercise();
    await expect(page.getByRole("progressbar", { name: /^\d+ seconds left$/ })).toBeVisible();

    await timed.playToEnd({ limit: 3 });
    await page.clock.fastForward("02:00");

    await expect(timed.completeHeading).toHaveText("Time's up!");
    const main = page.locator("main");
    await expect(main).toContainText(/total xp\s*3/i); // one XP per correct answer
    await expect(main.getByText("Time", { exact: true })).toBeVisible();
    await timed.finishCelebrations();
    await expect(page).toHaveURL(/\/learn$/);
  });

  test("a completed skill can be taken to legendary", async ({ page, api }) => {
    await page.goto("/learn");
    await page.getByRole("button", { name: "Family, completed, crown level 1" }).click();
    const popover = page.getByRole("dialog", { name: "Family" });
    await popover.getByRole("link", { name: /legendary \+40 xp/i }).click();
    await expect(page).toHaveURL(/\/legendary\/\d+$/);
    const skillId = new URL(page.url()).pathname.split("/").pop();

    const legendary = new LessonPage(page);
    await legendary.waitForExercise();
    await expect(
      page.locator("header").getByText("3 mistakes left", { exact: true }),
    ).toBeAttached();
    expect((await api.me()).stats.gems, "100 gems to enter").toBe(400);

    await legendary.playToEnd();
    await expect(legendary.completeHeading).toHaveText("Legendary complete!");
    await expect(page.locator("main")).toContainText(/total xp\s*40/i);
    await legendary.finishCelebrations();

    await expect(page).toHaveURL(new RegExp(`/learn\\?done=${skillId}$`));
    await expect(page.getByRole("button", { name: "Family, legendary" })).toBeVisible();
  });

  test("a legendary run ends once its three mistakes are used up", async ({ page, api }) => {
    const family = (await api.path()).units
      .flatMap((unit) => unit.nodes)
      .find((node) => node.title === "Family");
    expect(family, "the Family level").toBeDefined();
    await page.goto(`/legendary/${family?.id}`);
    const legendary = new LessonPage(page);
    await legendary.waitForExercise();
    await expect(legendary.mistakesLeft(3)).toBeAttached();

    // Three misses are allowed; the fourth ends the run.
    for (let misses = 1; misses <= 4; misses += 1) {
      expect(await legendary.nextStep()).toBe("exercise");
      const feedback = await legendary.answerWrongly();
      if (feedback !== null) {
        expect(feedback.correct, `feedback: ${feedback.text}`).toBe(false);
        await legendary.continueAfterFeedback();
      }
      if (misses < 4) await expect(legendary.mistakesLeft(3 - misses)).toBeAttached();
    }
    await expect(legendary.failedHeading).toBeVisible();
    await expect(page.locator("main")).toContainText("You used up all your mistakes");

    // Back on the path the level is still at crown 1, and the entry fee stays spent.
    await legendary.continueButton.click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(
      page.getByRole("button", { name: "Family, completed, crown level 1" }),
    ).toBeVisible();
    expect((await api.me()).stats.gems).toBe(400);
  });
});
