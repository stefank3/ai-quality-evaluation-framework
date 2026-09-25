/** Offline environment check invoked by npm run doctor/validate, with no arguments.
 * Reads Node version and local lockfile only; prints no environment secrets, creates no
 * files/processes and prohibits network via task preload. Exit 0 supported, 2 unsupported. */
import { existsSync } from "node:fs";
const [major, minor] = process.versions.node.split(".").map(Number);
if (major !== 24 || minor < 13 || !existsSync("package-lock.json")) {
  console.error("Use Node >=24.13 <25 and npm ci with the committed lockfile.");
  process.exitCode = 2;
} else {
  console.log(
    `Node ${process.versions.node}; lockfile present; deterministic commands require no credentials.`,
  );
}
