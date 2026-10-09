import { expect, test } from "./support/fixtures";
import { horizontalOverflow } from "./support/layout";
import { LessonPage } from "./support/lesson";
import { expectComingSoon } from "./support/ui";

test.describe("learning path", () => {
  test("shows every unit with completed, current and locked levels", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");

    await expect(page.getByRole("heading", { level: 1, name: "Learn" })).toBeAttached();
    for (const unit of ["Unit 1: Say hello", "Unit 2: Everyday life", "Unit 3: Out and about"]) {
      await expect(page.getByRole("heading", { level: 2, name: unit })).toBeAttached();
    }
    await expect(page.getByRole("button", { name: "Greetings, legendary" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Family, completed, crown level 1" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Getting around, locked" })).toBeVisible();

    // The page opens on the current level, so the sticky banner shows its unit.
    const current = page.getByRole("button", { name: "My day, current level, lesson 2 of 3" });
    await expect(current).toBeInViewport();
    await expect(page.getByText("Section 1, Unit 2", { exact: true })).toBeVisible();

    // The learner's stats sit in the right rail.
    await expect(page.getByRole("button", { name: "Streak: 12 days" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gems: 500" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hearts: 10" })).toBeVisible();

    await expectNoA11yViolations();
  });

  test("the current level's popover starts its next lesson", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    const node = await api.activeNode();
    await page.goto("/learn");

    await page.getByRole("button", { name: /, current level,/ }).click();
    const popover = page.getByRole("dialog", { name: node.title });
    await expect(popover).toContainText("Lesson 2 of 3");
    await expectNoA11yViolations();

    await popover.getByRole("link", { name: /^start \+10 xp$/i }).click();
    await expect(page).toHaveURL(new RegExp(`/lesson/${node.next_lesson_id}$`));
    const lesson = new LessonPage(page);
    await lesson.waitForExercise();
    await expect(lesson.hearts(10)).toBeAttached();
    await expect(page.getByRole("progressbar", { name: "Lesson progress" })).toBeVisible();
    await expectNoA11yViolations();
  });

  test("a locked level explains how to unlock it", async ({ page }) => {
    await page.goto("/learn");

    await page.getByRole("button", { name: "Getting around, locked" }).click();
    const popover = page.getByRole("dialog", { name: "Getting around" });
    await expect(popover).toContainText("Complete all levels above to unlock this!");
    await expect(popover.getByRole("button", { name: /^locked$/i })).toBeDisabled();
  });

  test("a locked unit offers to jump here, which is coming soon", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");
    const unit = page.getByRole("region", { name: "Unit 3: Out and about" });
    // Its first level carries the JUMP HERE? bubble instead of a lock.
    const first = unit.getByRole("button", { name: "Clothes, locked" });
    await expect(first).toHaveAttribute("data-glyph", "jump");
    await first.click();

    const popover = page.getByRole("dialog", { name: "Clothes" });
    await expect(popover).toContainText("Jump to Unit 3?");
    await expect(popover).toContainText("Pass a short test to skip ahead to this unit.");
    await expectNoA11yViolations();
    await popover.getByRole("button", { name: /^jump here\?$/i }).click();
    await expectComingSoon(page);

    // The unit's later levels stay plainly locked.
    await page.keyboard.press("Escape");
    await unit.getByRole("button", { name: "At the market, locked" }).click();
    await expect(page.getByRole("dialog", { name: "At the market" })).toContainText(
      "Complete all levels above to unlock this!",
    );
  });

  test("the guidebook is coming soon", async ({ page }) => {
    await page.goto("/learn");
    await page.getByRole("button", { name: "Guidebook" }).click();
    await expectComingSoon(page);
  });

  test("completed and legendary levels offer review and legendary", async ({ page }) => {
    await page.goto("/learn");

    await page.getByRole("button", { name: "Family, completed, crown level 1" }).click();
    const family = page.getByRole("dialog", { name: "Family" });
    await expect(family).toContainText("Level complete! Brush up on it or go for Legendary.");
    await expect(family.getByRole("link", { name: /legendary \+40 xp/i })).toBeVisible();
    await expect(family.getByRole("link", { name: /^review \+5 xp$/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(family).toBeHidden();

    await page.getByRole("button", { name: "Greetings, legendary" }).click();
    const greetings = page.getByRole("dialog", { name: "Greetings" });
    await expect(greetings).toContainText("You reached Legendary on this level. Impressive!");
    await expect(greetings.getByRole("link", { name: /legendary/i })).toHaveCount(0);

    // Reviewing a level is a lesson of its own.
    await greetings.getByRole("link", { name: /^review \+5 xp$/i }).click();
    await expect(page).toHaveURL(/\/lesson\/\d+\?kind=review$/);
    const review = new LessonPage(page);
    await review.waitForExercise();
    await review.playToEnd();
    await expect(review.completeHeading).toHaveText("Review complete!");
  });

  test("a treasure chest pays out once its levels are done", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    // The two levels before the unit's chest take five more lessons, played through the API.
    const chest = await api.completeLessonsUntil("chest");
    const gems = (await api.me()).stats.gems;

    await page.goto("/learn");
    const unit = page.getByRole("region", { name: "Unit 2: Everyday life" });
    await unit.getByRole("button", { name: `${chest.title}, ready to open` }).click();
    const popover = page.getByRole("dialog", { name: chest.title });
    await expectNoA11yViolations();
    await popover.getByRole("button", { name: /^open chest$/i }).click();

    await expect(page.getByText("+10 gems", { exact: true })).toBeVisible();
    await expect(popover).toBeHidden();
    await expect(page.getByRole("button", { name: `Gems: ${gems + 10}` })).toBeVisible();

    // An opened chest stays open and has nothing more to give.
    await unit.getByRole("button", { name: `${chest.title}, opened` }).click();
    await expect(page.getByRole("dialog", { name: chest.title })).toContainText(
      "You already opened this chest.",
    );
    await expect(page.getByRole("dialog").getByRole("button")).toHaveCount(0);
    expect((await api.me()).stats.gems).toBe(gems + 10);
  });
});

test.describe("unknown pages", () => {
  // The browser logs the page's own 404 status as a console error.
  test.use({ allowedConsoleErrors: [/status of 404/] });

  test("an unknown address shows the not-found page", async ({ page, expectNoA11yViolations }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page flew the nest" })).toBeVisible();
    await expectNoA11yViolations();

    await page.getByRole("link", { name: "Back to learning" }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });
});

test.describe("learning path on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("fits between the stats bar and the tab bar", async ({ page, expectNoA11yViolations }) => {
    await page.goto("/learn");

    await expect(page.getByRole("button", { name: /, current level,/ })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Streak: 12 days" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Main" });
    await expect(tabs.getByRole("link", { name: "Leaderboards" })).toBeVisible();

    expect(await horizontalOverflow(page), "horizontal overflow in px").toBeLessThanOrEqual(0);
    await expectNoA11yViolations();
  });
});
