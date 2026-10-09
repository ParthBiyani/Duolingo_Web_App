/**
 * The suite's `test`: every test starts from freshly reset sample learners, logged in as one of
 * them (Parth Biyani unless `learner` says otherwise) in both the API helper and the browser. It
 * fails on any console error, uncaught exception or 5xx response, and can run an accessibility
 * scan of the current screen.
 */
import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type APIRequestContext } from "@playwright/test";

import { Api, type Username } from "./api";

/** The exact Duolingo palette misses some contrast ratios on purpose (an accepted deviation). */
const DISABLED_AXE_RULES = ["color-contrast"];
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/** The seeded learner lives in Asia/Kolkata (UTC+5:30, no daylight saving). */
const LEARNER_UTC_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Streaks, daily goals and league weeks turn over at the learner's midnight. A test that started
 * just before it would see the day change halfway through, so such a test first waits it out.
 */
function msUntilLearnerMidnight(budgetMs: number): number {
  const left = DAY_MS - ((Date.now() + LEARNER_UTC_OFFSET_MS) % DAY_MS);
  return left <= budgetMs ? left + 2_000 : 0;
}

export interface A11yOptions {
  /** Limit the scan to this part of the page (a CSS selector). */
  include?: string;
}

interface Options {
  /**
   * Console errors a test expects. The browser logs every refused request (for example the API's
   * 409 when a lesson is started without hearts) as a console error.
   */
  allowedConsoleErrors: RegExp[];
  /** The sample learner the test runs as: the `api` helper and the browser are logged in. */
  learner: Username;
  /** False starts the browser logged out (on the login page); the `api` helper still logs in. */
  signedIn: boolean;
}

interface Fixtures {
  /** Direct API access for setup steps (demo clock, learner state, lessons without the UI). */
  api: Api;
  /** API access as another sample learner, on a cookie jar of its own. */
  apiAs: (username: Username) => Promise<Api>;
  /** Asserts that the current screen has no serious or critical accessibility violations. */
  expectNoA11yViolations: (options?: A11yOptions) => Promise<void>;
  /** Auto: the demo learner is reset before each test. */
  freshDemo: void;
  /** Auto: console errors, uncaught exceptions and 5xx responses fail the test. */
  pageGuard: void;
}

export const test = base.extend<Fixtures & Options>({
  allowedConsoleErrors: [[], { option: true }],
  learner: ["parthbiyani", { option: true }],
  signedIn: [true, { option: true }],

  api: async ({ request, learner }, provide) => {
    const api = new Api(request);
    await api.login(learner);
    await provide(api);
  },

  apiAs: async ({ playwright }, provide) => {
    const contexts: APIRequestContext[] = [];
    await provide(async (username) => {
      const context = await playwright.request.newContext();
      contexts.push(context);
      const api = new Api(context);
      await api.login(username);
      return api;
    });
    await Promise.all(contexts.map((context) => context.dispose()));
  },

  freshDemo: [
    async ({ api }, provide, testInfo) => {
      const wait = msUntilLearnerMidnight(testInfo.timeout);
      if (wait > 0) {
        testInfo.setTimeout(testInfo.timeout + wait);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      await api.resetDemo();
      await provide();
    },
    { auto: true },
  ],

  // The browser shares the API helper's session: the same signed cookie, set before any page
  // loads, so the app's proxy lets every page through instead of redirecting to /login.
  context: async ({ context, api, signedIn, freshDemo }, provide) => {
    void freshDemo;
    if (signedIn) await context.addCookies(await api.sessionCookies());
    await provide(context);
  },

  pageGuard: [
    async ({ page, allowedConsoleErrors }, provide) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (allowedConsoleErrors.some((pattern) => pattern.test(text))) return;
        const { url, lineNumber } = message.location();
        problems.push(`console error: ${text}${url ? ` (${url}:${lineNumber})` : ""}`);
      });
      page.on("pageerror", (error) => problems.push(`uncaught exception: ${error.message}`));
      page.on("response", (response) => {
        if (response.status() >= 500) {
          const request = response.request();
          problems.push(`HTTP ${response.status()} for ${request.method()} ${response.url()}`);
        }
      });
      await provide();
      expect(problems, "console errors, uncaught exceptions or 5xx responses").toEqual([]);
    },
    { auto: true },
  ],

  expectNoA11yViolations: async ({ page }, provide) => {
    await provide(async (options = {}) => {
      let builder = new AxeBuilder({ page }).disableRules(DISABLED_AXE_RULES);
      if (options.include) builder = builder.include(options.include);
      const { violations } = await builder.analyze();
      const blocking = violations
        .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""))
        .map(
          (violation) =>
            `${violation.id} (${violation.impact}): ${violation.help} -> ` +
            violation.nodes.map((node) => node.target.join(" ")).join(", "),
        );
      expect(blocking, `accessibility violations on ${page.url()}`).toEqual([]);
    });
  },
});

export { expect };
