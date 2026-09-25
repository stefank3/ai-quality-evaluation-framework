/** Validated domain boundaries for dataset, adapter and report flow. Called by loaders,
 * evaluators and runner; accepts unknown data and returns validated copies or throws.
 * No I/O. Strict objects reject unexpected fields; no raw validation errors reach CLI. */
import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9-]{1,63}$/);
const text = z.string().min(1).max(8000);
const concepts = z.array(z.string().min(1).max(200)).max(30);
const score = z.number().finite().min(0).max(1);

/** Approved synthetic evidence document; rejects extra fields and oversized text. */
export const KnowledgeDocumentSchema = z.strictObject({
  id,
  title: text,
  text,
});
/** Immutable knowledge document accepted by adapters. */
export type KnowledgeDocument = Readonly<
  z.infer<typeof KnowledgeDocumentSchema>
>;
/** Synthetic test specification. Expectations never travel to the live provider. */
export const EvaluationCaseSchema = z.strictObject({
  id,
  category: id,
  tags: z.array(id).max(10),
  input: text,
  knowledgeIds: z.array(id).min(1).max(10),
  expectedBehavior: text,
  requiredConcepts: concepts,
  prohibitedConcepts: concepts,
  refusalExpected: z.boolean(),
  latencyThresholdMs: z.number().int().positive().max(60000).optional(),
  stabilityExpected: z.boolean(),
  injectionAttempt: z.boolean(),
  protectedMarkers: concepts,
  sensitiveMarkers: concepts,
  piiPatterns: z.array(z.enum(["email", "phone"])).max(2),
});
/** Immutable case specification; arrays are copied at adapter boundaries. */
export type EvaluationCase = Readonly<z.infer<typeof EvaluationCaseSchema>>;
/** Citation references a stable approved document ID. */
export const CitationSchema = z.strictObject({ documentId: id });
/** Parsed citation with no provider-specific fields. */
export type Citation = z.infer<typeof CitationSchema>;
/** Structured assistant payload; transport duration is deliberately separate. */
export const ModelResponseSchema = z.strictObject({
  answer: text,
  refused: z.boolean(),
  citations: z.array(CitationSchema).max(20),
});
/** Valid response structure; validity alone says nothing about truth. */
export type ModelResponse = z.infer<typeof ModelResponseSchema>;
/** Provider-independent request; only input and approved context leave the runner. */
export const ModelRequestSchema = z.strictObject({
  caseId: id,
  input: text,
  context: z.array(KnowledgeDocumentSchema).min(1).max(10),
});
/** Request contract consumed by both adapters. */
export type ModelRequest = z.infer<typeof ModelRequestSchema>;
/** Stable evaluator names are also keys in the versioned scoring policy. */
export const EvaluatorIdSchema = z.enum([
  "contract",
  "required",
  "prohibited",
  "citations",
  "grounding",
  "refusal",
  "injection",
  "sensitive",
  "latency",
  "stability",
]);
/** Evaluator identity for policy lookups. */
export type EvaluatorId = z.infer<typeof EvaluatorIdSchema>;
/** Safe result deliberately excludes raw answers, input and matched sensitive values. */
export const EvaluatorResultSchema = z.strictObject({
  evaluator: EvaluatorIdSchema,
  passed: z.boolean(),
  score,
  explanation: z.string().min(1).max(200),
});
/** Deterministic measurement emitted by one evaluator. */
export type EvaluatorResult = z.infer<typeof EvaluatorResultSchema>;
/** Aggregated result with all-evaluator and critical-failure gates already applied. */
export const CaseResultSchema = z.strictObject({
  caseId: id,
  score,
  passed: z.boolean(),
  results: z.array(EvaluatorResultSchema).length(10),
});
/** Case verdict returned to reporting. */
export type CaseResult = z.infer<typeof CaseResultSchema>;
/** Run gate requires every case to pass as well as the score threshold. */
export const EvaluationSummarySchema = z.strictObject({
  total: z.number().int().positive(),
  passed: z.number().int().nonnegative(),
  score,
  gatePassed: z.boolean(),
});
/** Aggregate metadata without raw provider output. */
export type EvaluationSummary = z.infer<typeof EvaluationSummarySchema>;
/** Complete report, validated again before writing to disk. */
export const EvaluationReportSchema = z.strictObject({
  version: z.literal("1.0.0"),
  runId: z.string(),
  generatedAt: z.string(),
  datasetDigest: z.string().regex(/^[a-f0-9]{64}$/),
  policyDigest: z.string().regex(/^[a-f0-9]{64}$/),
  adapter: z.enum(["fixture-v1", "openai-compatible-v1"]),
  lane: z.enum(["deterministic", "live"]),
  cases: z.array(CaseResultSchema).min(1),
  summary: EvaluationSummarySchema,
  limitations: z.array(z.string()).min(1),
});
/** Serializable report consumed by JSON and Markdown renderers. */
export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;
