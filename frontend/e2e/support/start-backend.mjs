/**
 * Starts the API for the end-to-end suite on its own SQLite file: delete the old file, apply the
 * migrations, seed it, then serve it. Playwright runs this as a web server (see
 * playwright.config.ts) and stops the whole process tree when the run ends.
 *
 * Usage: node e2e/support/start-backend.mjs <database file> <port>
 */
import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../backend");
const dbFile = path.resolve(process.argv[2] ?? path.join(backendDir, "data", "e2e.db"));
const port = process.argv[3] ?? "8100";

// SQLAlchemy wants forward slashes; an absolute POSIX path gives sqlite://// (four slashes).
const env = {
  ...process.env,
  DATABASE_URL: `sqlite:///${dbFile.split(path.sep).join("/")}`,
  DEMO_TOOLS: "true",
  APP_ENV: "test",
  LOG_LEVEL: "warning",
};

for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(`${dbFile}${suffix}`, { force: true });
}

/** Runs one setup step to completion, stopping the script if it fails. */
function step(args) {
  const result = spawnSync("uv", ["run", ...args], { cwd: backendDir, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[e2e backend] "uv run ${args.join(" ")}" exited with ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

step(["alembic", "upgrade", "head"]);
step(["python", "-m", "app.seed", "--if-empty"]);

const server = spawn(
  "uv",
  [
    "run",
    "uvicorn",
    "app.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    port,
    "--log-level",
    "warning",
    "--no-access-log",
  ],
  { cwd: backendDir, env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
