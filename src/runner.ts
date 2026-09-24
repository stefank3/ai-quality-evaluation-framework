/** Sequential orchestration called by CLI and regression tests. Validated dataset and
 * adapter become a safe report; two calls for stable cases, one otherwise, concurrency one.
 * Adapter may do authorized I/O; runner never logs input or raw output and clones boundaries. */
import { EvaluationReportSchema, type EvaluationReport } from "./domain.js";
import type { ModelAdapter } from "./adapters/model.js";
import type { Dataset } from "./dataset.js";
import { evaluators } from "./evaluators.js";
import { scoreCase, summarize } from "./policy.js";
import { EvaluationError } from "./errors.js";

/** Evaluate a bounded selection. Throws DATASET on empty/oversized input, ADAPTER on bad timing.
 * Deterministic metadata uses an explicit fixed epoch rather than pretending to be wall time. */
export async function runEvaluation(
  dataset: Dataset,
  adapter: ModelAdapter,
  caseId?: string,
): Promise<EvaluationReport> {
  const selected = caseId
    ? dataset.cases.filter((item) => item.id === caseId)
    : dataset.cases;
  if (selected.length === 0 || selected.length > 100)
    throw new EvaluationError("DATASET");
  const cases = [];
  for (const testCase of selected) {
    const context = dataset.documents.filter((doc) =>
      testCase.knowledgeIds.includes(doc.id),
    );
    const payloads: unknown[] = [];
    const durations: number[] = [];
    for (
      let repeat = 0;
      repeat < (testCase.stabilityExpected ? 2 : 1);
      repeat += 1
    ) {
      const response = await adapter.generate(
        structuredClone({
          caseId: testCase.id,
          input: testCase.input,
          context,
        }),
      );
      if (!Number.isFinite(response.durationMs) || response.durationMs < 0)
        throw new EvaluationError("ADAPTER");
      payloads.push(structuredClone(response.payload));
      durations.push(response.durationMs);
    }
    const observation = {
      testCase,
      context,
      payloads,
      durations,
      groundingThreshold: dataset.policy.groundingThreshold,
    };
    const results = evaluators.map((evaluator) =>
      evaluator(structuredClone(observation)),
    );
    cases.push(scoreCase(testCase.id, results, dataset.policy));
  }
  const deterministic = adapter.identity === "fixture-v1";
  return EvaluationReportSchema.parse({
    version: "1.0.0",
    runId: `${adapter.identity}:${dataset.datasetDigest}:${caseId ?? "all"}`,
    generatedAt: deterministic
      ? "2000-01-01T00:00:00.000Z"
      : new Date().toISOString(),
    datasetDigest: dataset.datasetDigest,
    policyDigest: dataset.policyDigest,
    adapter: adapter.identity,
    lane: deterministic ? "deterministic" : "live",
    cases,
    summary: summarize(cases, dataset.policy),
    limitations: [
      "Synthetic fixtures test evaluator behavior, not a deployed AI system.",
      "Lexical grounding and pattern detection do not prove semantic truth or safety.",
      "A passing gate is limited evidence; live sampling and human review remain necessary.",
      "Deterministic generatedAt is a fixed reproducibility epoch, not execution time.",
    ],
  });
}
