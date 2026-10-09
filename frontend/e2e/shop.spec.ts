import type { Page } from "@playwright/test";

import { expect, test } from "./support/fixtures";
import { expectComingSoon } from "./support/ui";

/** One product row of the shop, found by its name. */
function shopItem(page: Page, name: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 3, name, exact: true }) });
}

/** The top banner picks its offer at random per page load; this fixes the roll first. */
async function rollBanner(page: Page, roll: number) {
  await page.addInitScript((value) => {
    Math.random = () => value;
  }, roll);
}

test.describe("shop", () => {
  test("buys a streak freeze until both slots are equipped", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { level: 1, name: "Shop" })).toBeAttached();
    const freeze = shopItem(page, "Streak freeze");
    await expect(freeze).toContainText("1 / 2 equipped");
    await expectNoA11yViolations();

    await freeze.getByRole("button", { name: "Buy Streak freeze for 200 gems" }).click();
    await expect(page.getByText("Streak Freeze equipped!")).toBeVisible();
    await expect(freeze).toContainText("2 / 2 equipped");
    await expect(freeze.getByRole("button", { name: /^equipped$/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Gems: 300" })).toBeVisible();

    const me = await api.me();
    expect(me.stats.streak.freezes).toBe(2);
    expect(me.stats.gems).toBe(300);
  });

  test("a full heart bar cannot be refilled", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("button", { name: "Hearts: 10" })).toBeVisible();
    await expect(
      shopItem(page, "Heart refill").getByRole("button", { name: /^full$/i }),
    ).toBeDisabled();
  });

  test("a heart refill fills the hearts, then shows as full", async ({ page, api }) => {
    const node = await api.activeNode();
    await api.loseHearts(node.next_lesson_id ?? 0, 3);

    await page.goto("/shop");
    const refill = shopItem(page, "Heart refill");
    await expect(page.getByRole("button", { name: "Hearts: 7" })).toBeVisible();

    await refill.getByRole("button", { name: "Buy Heart refill for 350 gems" }).click();
    await expect(page.getByText("Your hearts are full again!")).toBeVisible();
    await expect(refill.getByRole("button", { name: /^full$/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Hearts: 10" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gems: 150" })).toBeVisible();
    // 150 gems left: the 200-gem streak freeze is now out of reach.
    await expect(
      shopItem(page, "Streak freeze").getByRole("button", {
        name: "Buy Streak freeze for 200 gems",
      }),
    ).toBeDisabled();

    const me = await api.me();
    expect(me.stats.hearts).toBe(10);
    expect(me.stats.gems).toBe(150);
  });

  test("the banner offers the family plan, which is coming soon", async ({ page }) => {
    await rollBanner(page, 0.9);
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Start a family plan!" })).toBeVisible();
    await page.getByRole("button", { name: /^learn more$/i }).click();
    await expectComingSoon(page);
  });

  test("the banner offers the Super trial, which is coming soon", async ({ page }) => {
    await rollBanner(page, 0.1);
    await page.goto("/shop");
    await expect(
      page.getByRole("heading", {
        name: "Start a 1 week free trial to enjoy exclusive Super benefits",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^start my free 7 days$/i }).click();
    await expectComingSoon(page);

    // Unlimited hearts are a Super perk: a free trial, also coming soon.
    await shopItem(page, "Unlimited Hearts")
      .or(shopItem(page, "Unlimited hearts"))
      .getByRole("button", { name: /^free trial$/i })
      .click();
    await expectComingSoon(page);
  });
});
