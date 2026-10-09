import type { Page } from "@playwright/test";

import type { Zone } from "./support/api";
import { expect, test } from "./support/fixtures";

/** The learner's own row in the league table. */
function ownRow(page: Page, league: string) {
  return page.getByRole("list", { name: `${league} League` }).locator('li[aria-current="true"]');
}

/** Exactly "<xp> XP": the weekly total at the end of a row (a substring could match 120 for 20). */
const xpLabel = (xp: number) => new RegExp(`^${xp.toLocaleString("en-US")} XP$`);

/** Last week's result dialog: "promoted to", "held your place in" or "moved down to" a league. */
const RESULT_TITLE =
  /^(?:You've been promoted to the (\w+) League!|You held your place in the (\w+) League|You moved down to the (\w+) League)$/;

/**
 * Reads last week's result off its dialog. The final table is only known once the week closes
 * (rivals' XP for the rest of the week is added then), so the tests read it rather than predict it.
 */
async function readResult(page: Page) {
  const dialog = page.getByRole("dialog", { name: RESULT_TITLE });
  await expect(dialog).toBeVisible();
  const title = (await dialog.getByRole("heading").first().innerText()).trim();
  const [, promoted, stayed, demoted] = title.match(RESULT_TITLE) ?? [];
  const league = promoted ?? stayed ?? demoted;
  const rank = Number((await dialog.innerText()).match(/You finished #(\d+) last week\./)?.[1]);
  const outcome = promoted ? "promotion" : stayed ? "safe" : "demotion";
  return { dialog, league, rank, outcome } as const;
}

/** The zone a rank ends in, in a Silver league of 30 (top 15 up, bottom 5 down). */
function silverZone(rank: number): Zone {
  return rank <= 15 ? "promotion" : rank > 25 ? "demotion" : "safe";
}

test.describe("leaderboard", () => {
  test("lists the 30 learners of the league with the zones marked", async ({
    page,
    expectNoA11yViolations,
  }) => {
    await page.goto("/leaderboard");

    await expect(page.getByRole("heading", { level: 1, name: "Silver League" })).toBeVisible();
    await expect(page.getByText("Top 15 advance to the next league")).toBeVisible();

    // The zone dividers are hidden from assistive tech, so the list holds exactly 30 learners.
    const table = page.getByRole("list", { name: "Silver League" });
    await expect(table.getByRole("listitem")).toHaveCount(30);

    // The learner's own row is marked and highlighted.
    const own = table.locator('li[aria-current="true"]');
    await expect(own).toHaveCount(1);
    await expect(own).toContainText("Parth Biyani");
    const ownBackground = await own.evaluate((row) => getComputedStyle(row).backgroundColor);
    const otherBackground = await table
      .locator("li[data-zone]:not([aria-current])")
      .first()
      .evaluate((row) => getComputedStyle(row).backgroundColor);
    expect(ownBackground).not.toBe(otherBackground);

    // Silver promotes the top 15 and demotes the bottom 5.
    const items = table.locator(":scope > li");
    await expect(items).toHaveCount(32);
    await expect(items.nth(14)).toHaveAttribute("data-zone", "promotion");
    await expect(items.nth(15)).toHaveText(/promotion zone/i);
    await expect(items.nth(16)).toHaveAttribute("data-zone", "safe");
    await expect(items.nth(25)).toHaveAttribute("data-zone", "safe");
    await expect(items.nth(26)).toHaveText(/demotion zone/i);
    await expect(items.nth(27)).toHaveAttribute("data-zone", "demotion");
    await expect(table.locator('li[data-zone="demotion"]')).toHaveCount(5);

    await expectNoA11yViolations();
  });

  test("a finished lesson adds its XP to the learner's row", async ({ page, api }) => {
    const before = (await api.leaderboard()).rows.find((row) => row.is_me);
    expect(before, "the learner is in the league").toBeDefined();
    const node = await api.activeNode();
    const lesson = await api.completeLesson(node.next_lesson_id ?? 0);

    await page.goto("/leaderboard");
    const own = ownRow(page, "Silver");
    await expect(own.getByText(xpLabel((before?.xp ?? 0) + lesson.xp.total))).toBeVisible();
  });

  test("a new week settles the league and shows last week's result once", async ({
    page,
    api,
    expectNoA11yViolations,
  }) => {
    const { tiers } = await api.leaderboard();
    await api.advanceToNextWeek();

    await page.goto("/leaderboard");
    const result = await readResult(page);
    const dialog = result.dialog;
    // The outcome follows the final rank, and names the league one step up, the same or down.
    expect(result.outcome, `rank ${result.rank}`).toBe(silverZone(result.rank));
    const step = { promotion: 1, safe: 0, demotion: -1 }[result.outcome];
    expect(tiers.find((tier) => tier.tier === 1 + step)?.name).toBe(result.league);
    if (result.rank <= 3) await expect(dialog).toContainText("gems for a top 3 finish");
    await expectNoA11yViolations();
    await dialog.getByRole("button", { name: /^continue$/i }).click();
    await expect(dialog).toBeHidden();

    // A fresh week in the new league: everyone starts again and the learner has no XP yet.
    const heading = page.getByRole("heading", { level: 1, name: `${result.league} League` });
    await expect(heading).toBeVisible();
    await expect(ownRow(page, result.league).getByText(xpLabel(0))).toBeVisible();

    // Once dismissed, the result does not come back on the next visit.
    await page.reload();
    await expect(heading).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect((await api.leaderboard()).name).toBe(result.league);
  });

  // The API reports last week's result on the first read of the table only, and the right rail's
  // league card (on every main page) usually makes that read; the app keeps the result for the
  // Leaderboards page.
  test("last week's result still shows after another page loaded first", async ({ page, api }) => {
    await api.advanceToNextWeek();
    await page.goto("/learn");
    const rail = page.getByRole("complementary", { name: "Progress and offers" });
    await expect(rail.getByText(/^You're ranked #\d+$/)).toBeVisible();

    await page.goto("/leaderboard");
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("the rail and the profile name the new league once the week turns over", async ({
    page,
    api,
  }) => {
    await api.advanceToNextWeek();

    // The path is the first thing opened in the new week: /me closes the old week itself, so
    // the rail names the new league whichever request answers first.
    await page.goto("/learn");
    const rail = page.getByRole("complementary", { name: "Progress and offers" });
    await expect(rail.getByText(/^You're ranked #\d+$/)).toBeVisible();
    const { name } = await api.leaderboard();
    await expect(rail.getByRole("heading", { name: `${name} League` })).toBeVisible();
    await page.goto("/profile");
    const league = page
      .getByRole("region", { name: "Statistics" })
      .getByRole("listitem")
      .filter({ hasText: "Current league" });
    await expect(league.getByText(name, { exact: true })).toBeVisible();
  });
});

test.describe("shared leaderboard", () => {
  /** A learner's row in the table, by name. */
  const rowOf = (page: Page, name: string) =>
    page
      .getByRole("list", { name: "Silver League" })
      .getByRole("listitem")
      .filter({ hasText: name });

  test("learners in the same league see one table, and each other's XP", async ({
    page,
    api,
    apiAs,
    expectNoA11yViolations,
  }) => {
    // Parth, Isha and Kabir share this week's Silver league with 27 rivals.
    const board = await api.leaderboard();
    const learners = ["Parth Biyani", "Isha Nair", "Kabir Malhotra"];
    for (const name of learners) {
      expect(board.rows.map((row) => row.display_name)).toContain(name);
    }
    const ishaBefore = board.rows.find((row) => row.display_name === "Isha Nair")?.xp ?? 0;

    await page.goto("/leaderboard");
    await expect(rowOf(page, "Parth Biyani")).toHaveAttribute("aria-current", "true");
    await expect(rowOf(page, "Isha Nair")).not.toHaveAttribute("aria-current", "true");
    await expect(rowOf(page, "Isha Nair").getByText(xpLabel(ishaBefore))).toBeVisible();

    // Isha finishes a lesson; her XP shows on Parth's table straight away.
    const isha = await apiAs("ishanair");
    const node = await isha.activeNode();
    const lesson = await isha.completeLesson(node.next_lesson_id ?? 0);
    await page.reload();
    await expect(
      rowOf(page, "Isha Nair").getByText(xpLabel(ishaBefore + lesson.xp.total)),
    ).toBeVisible();
    expect((await isha.leaderboard()).rows.find((row) => row.is_me)?.xp).toBe(
      ishaBefore + lesson.xp.total,
    );

    // Logged in as Isha, the browser shows the same table with her own row highlighted.
    await page.context().clearCookies();
    await page.context().addCookies(await isha.sessionCookies());
    await page.reload();
    await expect(rowOf(page, "Isha Nair")).toHaveAttribute("aria-current", "true");
    await expect(rowOf(page, "Parth Biyani")).not.toHaveAttribute("aria-current", "true");
    await expect(
      page.getByRole("list", { name: "Silver League" }).getByRole("listitem"),
    ).toHaveCount(30);
    await expectNoA11yViolations();
  });

  test.describe("for a learner who has not unlocked leagues", () => {
    test.use({ learner: "ananyaiyer" });

    test("the leaderboard asks for more lessons first", async ({ page }) => {
      await page.goto("/leaderboard");
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { level: 1, name: "Unlock Leaderboards!" }),
      ).toBeVisible();
      await expect(main.getByText("Complete 10 more lessons to start competing")).toBeVisible();
      await main.getByRole("link", { name: /^start a lesson$/i }).click();
      await expect(page).toHaveURL(/\/learn$/);
    });
  });
});
