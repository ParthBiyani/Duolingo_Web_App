import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite: the real API on a fresh SQLite file (demo tools on) behind a production build
 * of the web app. Both run on their own ports, so a development setup on 3000/8000 is untouched.
 * Every test resets the sample learners first, so the tests share one database and run one at a
 * time.
 */
const CI = Boolean(process.env.CI);

const API_PORT = 8100;
const WEB_PORT = 3100;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

const backendDir = path.resolve(__dirname, "../backend");
const databaseFile = path.resolve(
  process.env.E2E_DB_PATH ?? path.join(backendDir, "data", "e2e.db"),
);
const startBackend = path.join(__dirname, "e2e", "support", "start-backend.mjs");

// Read by the test workers: the answer oracle opens the database file, setup steps call the API.
process.env.E2E_DB_PATH = databaseFile;
process.env.E2E_API_URL = API_URL;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    // On GitHub, failures are also annotated on the pull request.
    ...(CI ? [["github"] as const] : []),
  ],
  use: {
    baseURL: WEB_URL,
    locale: "en-US",
    timezoneId: "Asia/Kolkata",
    colorScheme: "light",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      name: "api",
      command: `node "${startBackend}" "${databaseFile}" ${API_PORT}`,
      cwd: backendDir,
      url: `${API_URL}/api/health`,
      reuseExistingServer: !CI,
      timeout: 180_000,
    },
    {
      name: "web",
      // Loopback only, like the API: the address Playwright polls, and nothing on the network.
      command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${WEB_PORT}`,
      cwd: __dirname,
      url: WEB_URL,
      env: {
        API_ORIGIN: API_URL,
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_DEMO_TOOLS: "true",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      reuseExistingServer: !CI,
      timeout: 360_000,
    },
  ],
});
