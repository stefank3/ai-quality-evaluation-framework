/** Report output boundary called by CLI. Validates safe report fields, renders JSON and
 * Markdown, writes only the selected lane directory under reports/. No network; filesystem
 * errors become FILE. Raw answers, prompts, endpoints and credentials are never serialized. */
import { mkdir, writeFile } from "node:fs/promises";
import { EvaluationReportSchema, type EvaluationReport } from "./domain.js";
import { EvaluationError } from "./errors.js";
/** Render concise safe evidence with every evaluator verdict and score; no side effects. */
export function markdownReport(report: EvaluationReport): string {
  const lines = [
    "# Evaluation report",
    "",
    `Lane: ${report.lane}; adapter: ${report.adapter}`,
    "",
    `Version: ${report.version}; generated: ${report.generatedAt}`,
    "",
    `Run: ${report.runId}`,
    "",
    `Dataset SHA-256: ${report.datasetDigest}`,
    "",
    `Policy SHA-256: ${report.policyDigest}`,
    "",
    `Gate: **${report.summary.gatePassed ? "PASS" : "FAIL"}**; cases: ${report.summary.passed}/${report.summary.total}; weighted score: ${report.summary.score.toFixed(4)}`,
    "",
    "| Case | Verdict | Score |",
    "| --- | --- | --- |",
  ];
  for (const item of report.cases)
    lines.push(
      `| ${item.caseId} | ${item.passed ? "PASS" : "FAIL"} | ${item.score.toFixed(4)} |`,
    );
  for (const item of report.cases) {
    lines.push("", `## ${item.caseId}`, "");
    for (const result of item.results)
      lines.push(
        `- ${result.evaluator}: ${result.passed ? "PASS" : "FAIL"} (${result.score.toFixed(4)}) - ${result.explanation}`,
      );
  }
  lines.push(
    "",
    "## Limitations",
    "",
    ...report.limitations.map((value) => `- ${value}`),
    "",
  );
  return lines.join("\n");
}
/** Write validated report pair in an isolated lane. Overwrites that lane's latest report only. */
export async function writeReports(report: EvaluationReport): Promise<void> {
  const parsed = EvaluationReportSchema.safeParse(report);
  if (!parsed.success) throw new EvaluationError("ADAPTER");
  try {
    const directory = `reports/${parsed.data.lane}`;
    await mkdir(directory, { recursive: true });
    await writeFile(
      `${directory}/report.json`,
      `${JSON.stringify(parsed.data, null, 2)}\n`,
    );
    await writeFile(`${directory}/report.md`, markdownReport(parsed.data));
  } catch {
    throw new EvaluationError("FILE");
  }
}
