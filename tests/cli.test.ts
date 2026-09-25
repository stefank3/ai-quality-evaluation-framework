/** CLI/boundary integration tests launch local Node processes with offline preload.
 * Risk: false-success exits, accidental egress, secret error leakage and live opt-in bypass.
 * Network prohibited; eval writes only gitignored deterministic reports. No live execution. */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { it, expect } from "vitest";
/** Run the real TypeScript CLI with explicit offline preload and bounded process lifetime. */
function cli(args: string[], cwd = process.cwd()) {
  return spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(`${process.cwd()}/scripts/offline.mjs`).href,
      "--import",
      "tsx",
      `${process.cwd()}/src/cli.ts`,
      ...args,
    ],
    {
      cwd,
      encoding: "utf8",
      timeout: 15000,
      env: { ...process.env, AI_EVAL_LIVE: "", AI_EVAL_API_KEY: "" },
    },
  );
}
it("returns zero for a passing case, one for failed gate and two for invalid configuration", () => {
  expect(cli(["eval", "--case", "grounded-answer"]).status).toBe(0);
  expect(cli(["eval"]).status).toBe(1);
  expect(cli(["eval", "--case", "missing-case"]).status).toBe(2);
  expect(cli(["bogus"]).status).toBe(2);
});
it("lists cases without evaluating and fails live closed without opt-in", () => {
  const listed = cli(["list"]);
  expect(listed.status).toBe(0);
  expect(listed.stdout).toContain("injection-resisted");
  const live = cli(["live"]);
  expect(live.status).toBe(2);
  expect(live.stderr).toContain("Configuration");
});
it("denies fetch, sockets, HTTP, HTTP2, DNS and UDP before external requests", () => {
  const code = `import net from 'node:net'; import https from 'node:https'; import http2 from 'node:http2'; import dns from 'node:dns'; import dgram from 'node:dgram';
    const attempts = [() => fetch('https://example.invalid'), () => net.connect(443, 'example.invalid'), () => https.get('https://example.invalid'), () => http2.connect('https://example.invalid'), () => dns.lookup('example.invalid', () => {}), () => dgram.createSocket('udp4')];
    for (const attempt of attempts) { try { await attempt(); process.exit(9); } catch (error) { if (!error.message.includes('NETWORK_DISABLED')) process.exit(8); } }`;
  const child = spawnSync(
    process.execPath,
    ["--import", "./scripts/offline.mjs", "--input-type=module", "-e", code],
    { encoding: "utf8", timeout: 10000 },
  );
  expect(child.status, child.stderr).toBe(0);
});
