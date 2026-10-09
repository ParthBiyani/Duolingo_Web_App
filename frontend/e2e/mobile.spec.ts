import { expect, test } from "./support/fixtures";
import { horizontalOverflow } from "./support/layout";

/** The main screens, each with something that shows it has loaded. */
const SCREENS = [
  { tab: "Practice", path: "/practice-hub", ready: { role: "link", name: "Start timed practice" } },
  { tab: "Leaderboards", path: "/leaderboard", ready: { role: "list", name: "Silver League" } },
  { tab: "Quests", path: "/quests", ready: { role: "region", name: "Daily Quests" } },
  { tab: "Shop", path: "/shop", ready: { role: "region", name: "Power-Ups" } },
  { tab: "Profile", path: "/profile", ready: { role: "region", name: "Statistics" } },
] as const;

test.describe("on a phone (390x844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const screen of SCREENS) {
    test(`${screen.tab} fits the width, under the stats bar and above the tab bar`, async ({
      page,
      expectNoA11yViolations,
    }) => {
      await page.goto("/learn");
      const tabs = page.getByRole("navigation", { name: "Main" });
      await tabs.getByRole("link", { name: screen.tab }).click();
      await expect(page).toHaveURL(new RegExp(`${screen.path}$`));
      await expect(
        page.getByRole(screen.ready.role, { name: screen.ready.name }).first(),
      ).toBeVisible();

      // The stats bar sits on top and the tab bar at the bottom; the right rail is gone.
      const stats = page.getByRole("group", { name: "Your stats" });
      await expect(stats.getByRole("button", { name: "Streak: 12 days" })).toBeInViewport();
      await expect(stats.getByRole("button", { name: "Hearts: 10" })).toBeInViewport();
      await expect(tabs).toBeInViewport();
      await expect(page.getByRole("complementary", { name: "Progress and offers" })).toBeHidden();
      await expect(tabs.getByRole("link", { name: screen.tab })).toHaveAttribute(
        "aria-current",
        "page",
      );

      expect(await horizontalOverflow(page), "horizontal overflow in px").toBeLessThanOrEqual(0);
      await expectNoA11yViolations();
    });
  }

  test("settings opens from the tab bar's More menu and fits", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("button", { name: "More" })
      .click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings\/preferences$/);
    await expect(page.getByRole("heading", { level: 1, name: "Preferences" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Demo tools" })).toBeAttached();
    expect(await horizontalOverflow(page), "horizontal overflow in px").toBeLessThanOrEqual(0);
    await expectNoA11yViolations();
  });

  test("a stat popover fits the screen", async ({ page }) => {
    await page.goto("/learn");
    // Touch screens open the popover with a tap.
    await page
      .getByRole("group", { name: "Your stats" })
      .getByRole("button", { name: "Hearts: 10" })
      .click();
    const panel = page.getByRole("dialog");
    await expect(panel).toContainText("You have full hearts");
    const box = await panel.boundingBox();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  });
});
