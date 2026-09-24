/** Versioned scoring boundary called by runner and repository tests. Validates policy
 * data and combines unique evaluator results into case/run verdicts; no I/O.
 * Missing/duplicate measurements fail closed, and critical failures override scores. */
import { z } from "zod";
import {
  EvaluatorIdSchema,
  type EvaluatorResult,
  type CaseResult,
  type EvaluationSummary,
} from "./domain.js";
import { EvaluationError } from "./errors.js";
const threshold = z.number().finite().min(0).max(1);
/** Strict policy schema requires every evaluator and positive, visible weights. */
export const PolicySchema = z.strictObject({
  version: z.literal("1.0.0"),
  caseThreshold: threshold,
  runThreshold: threshold,
  groundingThreshold: threshold,
  rules: z.record(
    EvaluatorIdSchema,
    z.strictObject({
      weight: z.number().positive().max(100),
      critical: z.boolean(),
    }),
  ),
});
/** Validated aggregation policy. */
export type Policy = z.infer<typeof PolicySchema>;
/** Aggregate all measurements for a case; throws CONFIG for missing/duplicate IDs. */
export function scoreCase(
  caseId: string,
  results: EvaluatorResult[],
  policy: Policy,
): CaseResult {
  if (
    results.length !== EvaluatorIdSchema.options.length ||
    new Set(results.map((r) => r.evaluator)).size !== results.length
  ) {
    throw new EvaluationError("CONFIG");
  }
  let earned = 0;
  let possible = 0;
  let criticalFailure = false;
  for (const result of results) {
    const rule = policy.rules[result.evaluator];
    earned += result.score * rule.weight;
    possible += rule.weight;
    criticalFailure ||= rule.critical && !result.passed;
  }
  const score = earned / possible;
  return {
    caseId,
    score,
    passed: !criticalFailure && score >= policy.caseThreshold,
    results: structuredClone(results),
  };
}
/** Summarize a nonempty run; zero failed cases are permitted by the run gate. */
export function summarize(
  cases: CaseResult[],
  policy: Policy,
): EvaluationSummary {
  if (cases.length === 0) throw new EvaluationError("DATASET");
  const score = cases.reduce((sum, item) => sum + item.score, 0) / cases.length;
  const passed = cases.filter((item) => item.passed).length;
  return {
    total: cases.length,
    passed,
    score,
    gatePassed: passed === cases.length && score >= policy.runThreshold,
  };
}
