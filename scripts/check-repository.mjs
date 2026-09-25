/** Offline repository audit invoked by npm run check:repository/validate, no arguments.
 * Inventories maintained files (excluding ignored runtime directories), checks relative
 * Markdown links, study inventory, module headers, source size, secret patterns and CI lane.
 * Reads local files only; no processes/network/writes. Prints counts, exits 1 on violations.
 * Pattern checks are defense in depth and do not replace human secret review. */
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
const ignored = new Set([
  ".git",
  "node_modules",
  "dist",
  "reports",
  "tmp",
  "coverage",
  "__pycache__",
]);
/** Enumerate maintained files consistently across platforms without following symlinks. */
async function inventory(directory = ".") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink())
      throw new Error("Maintained symlinks are not supported.");
    if (entry.isDirectory()) files.push(...(await inventory(path)));
    else files.push(path.replace(/^\.\//, ""));
  }
  return files.sort();
}
const files = await inventory();
const failures = [];
const walkthrough = await readFile("docs/code-walkthrough.md", "utf8");
for (const file of files) {
  if (!walkthrough.includes(`\`${file}\``))
    failures.push(`Missing walkthrough inventory: ${file}`);
  if (file.endsWith(".pdf")) continue;
  const content = await readFile(file, "utf8");
  if (/\.(ts|mjs|js)$/.test(file)) {
    if (!content.startsWith("/**"))
      failures.push(`Missing module comment: ${file}`);
    if (content.split("\n").length > 350)
      failures.push(`Source file needs size review: ${file}`);
  }
  if (
    /(?:gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(
      content,
    )
  )
    failures.push(`Potential secret: ${file}`);
  if (file.endsWith(".md")) {
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const path = resolve(
        dirname(file),
        decodeURIComponent(target.split("#")[0]),
      );
      const local = relative(resolve("."), path);
      if (local.startsWith("..") || !(await stat(path).catch(() => null)))
        failures.push(`Broken/escaping link: ${file} -> ${target}`);
    }
  }
}
const workflow = await readFile(".github/workflows/validate.yml", "utf8");
if (
  /eval:live|AI_EVAL_|schedule:|pull_request_target|secrets\./.test(workflow) ||
  !workflow.includes("npm run validate") ||
  !workflow.includes("contents: read")
)
  failures.push("CI lane/permissions violation");
const config = await readFile("src/config.ts", "utf8");
if (
  !config.includes("env.CI !== undefined") ||
  !config.includes("env.GITHUB_ACTIONS !== undefined")
)
  failures.push("Missing live CI guard");
const forbidden = files.filter((file) =>
  /(^|\/)(\.env(?:\.|$)|(?:node_modules|reports|\.vscode|\.idea)(?:\/|$))/.test(
    file,
  ),
);
failures.push(...forbidden.map((file) => `Forbidden maintained file: ${file}`));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Repository checks passed: ${files.length} maintained files, links, headers, size, secret patterns and CI lane.`,
  );
