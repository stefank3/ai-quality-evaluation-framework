/** Cross-platform npm command dispatcher. Invoke via documented npm scripts, optionally
 * --case ID for eval/list/live. Reads only task arguments and NODE_OPTIONS/npm_execpath;
 * spawns local Node tools and sets offline preload for all deterministic children.
 * PDF calls local Python (PYTHON override); only explicit live command permits HTTPS.
 * Outputs dist/reports or formatting edits by task; exits with child status, 2 on misuse.
 * validate expects the deliberate fault dataset to exit 1, but all engineering checks 0. */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const [task, ...args] = process.argv.slice(2);
const preload = pathToFileURL(resolve("scripts/offline.mjs")).href;
const env = {
  ...process.env,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${preload}`,
};
const commands = {
  doctor: ["scripts/doctor.mjs"],
  format: ["node_modules/prettier/bin/prettier.cjs", "--write", "."],
  "format:check": ["node_modules/prettier/bin/prettier.cjs", "--check", "."],
  lint: ["node_modules/eslint/bin/eslint.js", "."],
  typecheck: ["node_modules/typescript/bin/tsc", "-p", "tsconfig.tests.json"],
  test: ["node_modules/vitest/vitest.mjs", "run"],
  build: ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
  repository: ["scripts/check-repository.mjs"],
  eval: ["--import", "tsx", "src/cli.ts", "eval"],
  list: ["--import", "tsx", "src/cli.ts", "list"],
  live: ["--import", "tsx", "src/cli.ts", "live"],
};
/** Execute a local child, preserving its status. No shell expansion or swallowed failures. */
function run(command, extra = [], expected = 0) {
  const result = spawnSync(process.execPath, [...command, ...extra], {
    stdio: "inherit",
    env,
  });
  if (result.error || result.status !== expected)
    process.exit(result.status === 0 ? 2 : (result.status ?? 2));
}
if (task === "validate" && args.length === 0) {
  for (const name of [
    "doctor",
    "format:check",
    "lint",
    "typecheck",
    "test",
    "build",
    "repository",
    "list",
  ])
    run(commands[name]);
  run(commands.eval, [], 1);
  console.log(
    "Validation passed; deliberate fault dataset correctly failed its quality gate.",
  );
} else if (task === "pdf" && args.length === 0) {
  const result = spawnSync(
    process.env.PYTHON ?? "python",
    ["scripts/docs_pdf.py"],
    { stdio: "inherit", env },
  );
  process.exitCode = result.status ?? 2;
} else if (
  task &&
  Object.hasOwn(commands, task) &&
  (["eval", "list", "live"].includes(task) || args.length === 0)
) {
  if (task === "live") {
    const result = spawnSync(process.execPath, [...commands.live, ...args], {
      stdio: "inherit",
      env: process.env,
    });
    process.exitCode = result.status ?? 2;
  } else {
    run(commands[task], args);
  }
} else {
  console.error("Unknown task or unsupported arguments.");
  process.exitCode = 2;
}
