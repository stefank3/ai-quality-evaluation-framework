/** npm eval/list/live entry point: arguments -> config -> dataset -> adapter -> report -> exit.
 * Accepts eval|list|live [--case ID]; live alone reads AI_EVAL_* variables (see security docs).
 * Writes reports/<lane>; live can use HTTPS only after opt-in; eval/list prohibit network via
 * npm preload. Exit 0 gate pass/list, 1 failed quality gate, 2 sanitized configuration/I/O error. */
import { parseConfig } from "./config.js";
import { loadDataset } from "./dataset.js";
import { FixtureAdapter } from "./adapters/fixture.js";
import { runEvaluation } from "./runner.js";
import { writeReports } from "./reports.js";
import { EvaluationError } from "./errors.js";

/** Execute CLI with process arguments; all failures are sanitized, never dump error objects. */
async function main(): Promise<void> {
  try {
    const config = parseConfig(process.argv.slice(2), process.env);
    const dataset = await loadDataset();
    if (config.command === "list") {
      const selected = dataset.cases.filter(
        (item) => !config.caseId || item.id === config.caseId,
      );
      if (!selected.length) throw new EvaluationError("DATASET");
      console.log(
        selected.map((item) => `${item.id}\t${item.category}`).join("\n"),
      );
      return;
    }
    let adapter;
    if (config.command === "live" && config.live) {
      const count = dataset.cases.filter(
        (item) => !config.caseId || item.id === config.caseId,
      ).length;
      if (count > config.live.maxCases) throw new EvaluationError("CONFIG");
      const { LiveAdapter } = await import("./adapters/live.js");
      adapter = new LiveAdapter(config.live);
    } else {
      adapter = new FixtureAdapter(dataset.fixtures);
    }
    const report = await runEvaluation(dataset, adapter, config.caseId);
    await writeReports(report);
    console.log(
      `${report.summary.gatePassed ? "PASS" : "FAIL"}: ${report.summary.passed}/${report.summary.total} cases; reports/${report.lane}/report.{json,md}`,
    );
    process.exitCode = report.summary.gatePassed ? 0 : 1;
  } catch (error) {
    console.error(
      error instanceof EvaluationError
        ? `${error.code}: ${error.message}`
        : "CONFIG: Evaluation could not complete safely.",
    );
    process.exitCode = 2;
  }
}
await main();
