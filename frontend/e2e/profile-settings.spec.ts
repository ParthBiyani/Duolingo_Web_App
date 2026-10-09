import { expect, test } from "./support/fixtures";
import { startActiveLesson } from "./support/lesson";
import { expectComingSoon, expectStat, onLearnPage } from "./support/ui";

test.describe("profile", () => {
  test("shows the learner's statistics and achievements", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/profile");

    await expect(page.getByRole("heading", { level: 1, name: "Parth Biyani" })).toBeVisible();
    await expect(page.getByText("parthbiyani", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Joined \w+ \d{4}$/)).toBeVisible();
    await expect(page.getByRole("img", { name: "Learning Spanish" })).toBeVisible();

    const stats = page.getByRole("region", { name: "Statistics" });
    await expect(stats.getByRole("listitem")).toHaveCount(4);
    // Each tile shows its value above its label; the value must match exactly (2, not 12).
    for (const [label, value] of [
      ["Day streak", "12"],
      ["Total XP", "1,240"],
      ["Current league", "Silver"],
      ["Top 3 finishes", "2"],
    ]) {
      const tile = stats.getByRole("listitem").filter({ hasText: label });
      await expect(tile.getByText(value, { exact: true })).toBeVisible();
    }

    const achievements = page.getByRole("region", { name: "Achievements" });
    for (const name of [
      "Wildfire",
      "Sage",
      "Sharpshooter",
      "Champion",
      "Overachiever",
      "Legendary",
    ]) {
      await expect(
        achievements.getByRole("heading", { level: 3, name, exact: true }),
      ).toBeVisible();
    }
    await expect(
      achievements.getByRole("progressbar", { name: "Sage, level 4 of 10" }),
    ).toBeVisible();
    await expect(achievements).toContainText("1,240/2,000");

    // The profile swaps the rail's cards for friends, which are not built yet.
    const rail = page.getByRole("complementary", { name: "Progress and offers" });
    await expect(rail.getByRole("tab", { name: "Following" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await rail.getByRole("tab", { name: "Followers" }).click();
    await expect(rail.getByRole("tab", { name: "Followers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await expectNoA11yViolations();

    for (const name of ["Edit profile", "0 Following", "0 Followers"]) {
      await page.getByRole("main").getByRole("button", { name }).click();
      await expectComingSoon(page);
    }
    await rail.getByRole("button", { name: "Find friends" }).click();
    await expectComingSoon(page);
  });

  test("another learner's profile shows their own progress", async ({ page, apiAs }) => {
    // Kabir is three months in: his own numbers, not Parth's.
    const kabir = await apiAs("kabirmalhotra");
    await page.context().clearCookies();
    await page.context().addCookies(await kabir.sessionCookies());

    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Kabir Malhotra" })).toBeVisible();
    const stats = page.getByRole("region", { name: "Statistics" });
    await expect(stats.getByRole("listitem").filter({ hasText: "Day streak" })).toContainText("64");
    await expect(stats.getByRole("listitem").filter({ hasText: "Total XP" })).toContainText(
      "4,120",
    );
  });
});

test.describe("settings", () => {
  test("dark mode switches the theme and is remembered", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    await page.goto("/settings/preferences");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.getByLabel("Dark mode").selectOption("dark");
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(page.getByText("Changes saved")).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(19, 31, 36)");
    await expect.poll(async () => (await api.me()).settings.theme).toBe("dark");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(page.getByLabel("Dark mode")).toHaveValue("dark");
    await expectNoA11yViolations();
  });

  test("a new daily goal shows on the quest card", async ({ page, expectNoA11yViolations }) => {
    await page.goto("/settings/preferences");
    await expectNoA11yViolations();

    await page.getByLabel("Daily goal").selectOption("30");
    await expect(page.getByText("Changes saved")).toBeVisible();
    await onLearnPage(page, async (learn) => {
      const rail = learn.getByRole("complementary", { name: "Progress and offers" });
      await expect(rail.getByRole("progressbar", { name: "Earn 30 XP" })).toBeVisible();
    });

    await page.getByRole("link", { name: "Quests", exact: true }).click();
    await expect(page).toHaveURL(/\/quests$/);
    await expect(page.getByRole("progressbar", { name: "Earn 30 XP: 0 of 30" })).toBeVisible();
    await expectNoA11yViolations();
  });

  test("lesson preferences are saved", async ({ page, api }) => {
    await page.goto("/settings/preferences");
    const names = ["Sound effects", "Animations", "Motivational messages", "Listening exercises"];
    for (const name of names) {
      const toggle = page.getByRole("switch", { name });
      await expect(toggle).toBeChecked();
      await toggle.click();
      await expect(toggle).not.toBeChecked();
    }
    await expect(page.locator("html")).toHaveAttribute("data-animations", "off");
    await expect
      .poll(async () => (await api.me()).settings)
      .toMatchObject({
        sound_effects: false,
        animations: false,
        motivational_messages: false,
        listening_exercises: false,
      });

    await page.reload();
    for (const name of names) {
      await expect(page.getByRole("switch", { name })).not.toBeChecked();
    }
  });

  test("dark mode carries into the lesson player", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    await api.updateSettings({ theme: "dark" });
    const lesson = await startActiveLesson(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(19, 31, 36)");
    await expectNoA11yViolations();

    const feedback = await lesson.answerCorrectly();
    expect(feedback?.correct).toBe(true);
    // In the dark palette the feedback bar keeps the raised surface tone (--feedback-correct-bg).
    await expect(page.locator("footer > div").first()).toHaveCSS(
      "background-color",
      "rgb(32, 47, 54)",
    );
    await expectNoA11yViolations();
  });

  test("demo tools put the learner and the clock back to the start", async ({ page, api }) => {
    // Two days off with one freeze break the 12-day streak.
    await api.setDailyGoal(50);
    await api.advanceDays(2);

    await page.goto("/settings/preferences");
    const demo = page.getByRole("region", { name: "Demo tools" });
    await expect(demo.getByText("+2 days", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Daily goal")).toHaveValue("50");
    await expectStat(page, "Streak: 0 days");

    await demo.getByRole("button", { name: "Reset demo data" }).click();
    const dialog = page.getByRole("dialog", { name: "Reset demo data?" });
    await dialog.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Demo data reset")).toBeVisible();
    await expect(demo.getByText("Real time", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Daily goal")).toHaveValue("20");
    await expectStat(page, "Streak: 12 days");
    expect((await api.me()).settings.daily_goal_xp).toBe(20);
  });
});

test.describe("features still to come", () => {
  test("say they are coming soon", async ({ page, expectNoA11yViolations }) => {
    // The sidebar's More menu: the English Test, the podcast and Help are placeholders.
    await page.goto("/learn");
    const sidebar = page.getByRole("navigation", { name: "Main" });
    for (const item of ["Duolingo English Test", "Podcast", "Help"]) {
      await sidebar.getByRole("button", { name: "More" }).click();
      await page.getByRole("menuitem", { name: item }).click();
      await expectComingSoon(page);
    }
    // So are the rail's Super offer and its footer links.
    const rail = page.getByRole("complementary", { name: "Progress and offers" });
    await rail.getByRole("button", { name: /^try 1 week free$/i }).click();
    await expectComingSoon(page);
    await rail.getByRole("button", { name: /^about$/i }).click();
    await expectComingSoon(page);

    // Settings sits in the same menu.
    await sidebar.getByRole("button", { name: "More" }).click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings\/preferences$/);

    // Only Preferences and Courses are built; the other account pages are placeholders.
    const nav = page.getByRole("navigation", { name: "Settings" });
    for (const title of ["Profile", "Notifications", "Privacy settings"]) {
      await nav.getByRole("link", { name: title, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.locator("#main-content")).toContainText("Coming soon");
    }
    await expectNoA11yViolations();
    for (const name of ["Choose a plan", "Help Center"]) {
      await nav.getByRole("button", { name }).click();
      await expectComingSoon(page);
    }

    await nav.getByRole("link", { name: "Courses", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Courses" })).toBeVisible();
    await page.getByRole("button", { name: /^French/ }).click();
    await expectComingSoon(page);
    await expectNoA11yViolations();
  });
});
