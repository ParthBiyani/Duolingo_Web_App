import type { Page } from "@playwright/test";

import { LEARNERS, type Username } from "./support/api";
import { expect, test } from "./support/fixtures";
import { horizontalOverflow } from "./support/layout";
import { expectComingSoon } from "./support/ui";

/** Each sample learner's card on the login page, with what it says about them. */
const CARDS: Record<Username, { summary: RegExp; streak: string }> = {
  parthbiyani: { summary: /Unit 2.*1,240 XP.*12-day streak/, streak: "Streak: 12 days" },
  ananyaiyer: { summary: /Unit 1.*0 XP.*no streak/, streak: "Streak: 0 days" },
  ishanair: { summary: /Unit 1.*205 XP.*4-day streak/, streak: "Streak: 4 days" },
  kabirmalhotra: { summary: /Unit 3.*4,120 XP.*64-day streak/, streak: "Streak: 64 days" },
};

function learnerCard(page: Page, name: string) {
  return page.getByRole("button", { name: new RegExp(`^Log in as ${name}\\b`) });
}

test.describe("login page", () => {
  test.use({ signedIn: false });

  test("app pages send a logged-out visitor to the login page", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Log in" })).toBeVisible();
    await expect(page).toHaveTitle("Log in - Duolingo");

    // The four sample learners sit in a 2x2 grid.
    const cards = page.getByRole("region", { name: "Sample learners" }).getByRole("button");
    await expect(cards).toHaveCount(4);
    const boxes = await Promise.all((await cards.all()).map((card) => card.boundingBox()));
    const [first, second, third, fourth] = boxes.map((box) => box ?? { x: 0, y: 0 });
    expect(second.y, "first row").toBeCloseTo(first.y, 0);
    expect(second.x).toBeGreaterThan(first.x);
    expect(third.y, "second row").toBeGreaterThan(first.y);
    expect(third.x, "second row, first column").toBeCloseTo(first.x, 0);
    expect(fourth.y).toBeCloseTo(third.y, 0);

    for (const [username, name] of Object.entries(LEARNERS)) {
      await expect(learnerCard(page, name)).toContainText(CARDS[username as Username].summary);
    }
    await expectNoA11yViolations();
  });

  for (const [username, name] of Object.entries(LEARNERS) as [Username, string][]) {
    test(`picking ${name} logs in as them`, async ({ page }) => {
      await page.goto("/login");
      await learnerCard(page, name).click();

      await expect(page).toHaveURL(/\/learn$/);
      await expect(page.getByRole("button", { name: CARDS[username].streak })).toBeVisible();
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Profile" })
        .click();
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByText(username, { exact: true })).toBeVisible();
    });
  }

  test("sign up, password log in and forgot password are coming soon", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /^sign up$/i }).click();
    await expectComingSoon(page);

    await page.getByRole("button", { name: /^forgot\?$/i }).click();
    await expectComingSoon(page);

    await page.getByRole("textbox", { name: "Email or username" }).fill("parthbiyani");
    await page.getByLabel("Password").fill("secret");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expectComingSoon(page);
    await expect(page).toHaveURL(/\/login$/);
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("fits the screen", async ({ page, expectNoA11yViolations }) => {
      await page.goto("/login");
      await expect(learnerCard(page, LEARNERS.kabirmalhotra)).toBeInViewport();
      expect(await horizontalOverflow(page), "horizontal overflow in px").toBeLessThanOrEqual(0);
      await expectNoA11yViolations();
    });
  });
});

test.describe("logging out", () => {
  // Requests still in flight as the session ends are refused, and the browser logs the 401.
  // Next's prefetches of app pages, redirected to /login as the session changes, can also end
  // in a 404 for their RSC payload; the page itself is unaffected.
  test.use({ allowedConsoleErrors: [/status of 40[14]/] });

  test("the sidebar's More menu logs out", async ({ page, api }) => {
    await page.goto("/learn");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("button", { name: "More" })
      .click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    await expect(page).toHaveURL(/\/login$/);
    const cookies = await page.context().cookies();
    expect(cookies.map((cookie) => cookie.name)).not.toContain("duo_session");

    // Without the session, app pages lead back to the login page.
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login$/);
    // The API helper has a session of its own, which still works.
    expect(await api.status("/me")).toBe(200);
  });

  test("settings has a log out button too", async ({ page }) => {
    await page.goto("/settings/preferences");
    await page
      .getByRole("navigation", { name: "Settings" })
      .getByRole("button", { name: /^log out$/i })
      .click();
    await expect(page).toHaveURL(/\/login$/);

    // Logging in again as someone else switches learner.
    await learnerCard(page, LEARNERS.ishanair).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole("button", { name: "Streak: 4 days" })).toBeVisible();
  });

  test("a forged session cookie is refused and leads to the login page", async ({ page }) => {
    await page.context().clearCookies();
    await page
      .context()
      .addCookies([
        { name: "duo_session", value: "parthbiyani.forged", domain: "127.0.0.1", path: "/" },
      ]);
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/login$/);
    await expect(learnerCard(page, LEARNERS.parthbiyani)).toBeVisible();
  });
});
