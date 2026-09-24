/** Unit tests for evaluator false positives, malformed payloads and critical gates.
 * Runs under Vitest offline setup; network prohibited. Mutations use fresh observations
 * so tests prove behavior without leaking state between cases. No output files. */
import { describe, it, expect } from "vitest";
import { loadDataset } from "../src/dataset.js";
import { normalize, includesConcept } from "../src/normalize.js";
import {
  evaluators,
  grounding,
  latency,
  stability,
  sensitive,
  citations,
  type Observation,
} from "../src/evaluators.js";
import {
  ModelResponseSchema,
  EvaluationCaseSchema,
  EvaluatorIdSchema,
} from "../src/domain.js";
import { scoreCase, summarize } from "../src/policy.js";
const dataset = await loadDataset();
/** Create fresh valid observation for every test; no adapter I/O required. */
function observation(): Observation {
  const testCase = dataset.cases.find((item) => item.id === "grounded-answer");
  const fixture = dataset.fixtures["grounded-answer"];
  if (!testCase || !fixture) throw new Error("Missing baseline fixture");
  return structuredClone({
    testCase,
    context: dataset.documents,
    payloads: [fixture.payloads[0], fixture.payloads[0]],
    durations: [20, 20],
    groundingThreshold: 0.7,
  });
}
describe("normalization and schemas", () => {
  it("normalizes Unicode width, case, punctuation and whitespace deterministically", () => {
    expect(normalize("  ＲＥＣＥＩＰＴ, 30 DAYS! ")).toBe("receipt 30 days");
    expect(includesConcept("receipts", "receipt")).toBe(false);
    expect(includesConcept("anything", "!!!")).toBe(false);
  });
  it("rejects extra fields, wrong booleans, empty answers and unknown case fields", () => {
    expect(
      ModelResponseSchema.safeParse({
        answer: "",
        refused: false,
        citations: [],
      }).success,
    ).toBe(false);
    expect(
      ModelResponseSchema.safeParse({
        answer: "ok",
        refused: "false",
        citations: [],
      }).success,
    ).toBe(false);
    expect(
      EvaluationCaseSchema.safeParse({
        ...observation().testCase,
        surprise: true,
      }).success,
    ).toBe(false);
  });
});
describe("all evaluator responsibilities", () => {
  it("passes all ten independent checks on a grounded answer", () => {
    expect(
      evaluators.map((evaluator) => evaluator(observation()).passed),
    ).toEqual(Array(10).fill(true));
  });
  it.each(EvaluatorIdSchema.options.filter((id) => id !== "latency"))(
    "fails %s closed on malformed response",
    (id) => {
      const result = evaluators
        .map((evaluator) =>
          evaluator({ ...observation(), payloads: [{ answer: 3 }] }),
        )
        .find((item) => item.evaluator === id);
      expect(result?.passed).toBe(false);
    },
  );
  it("uses reported latency and rejects NaN, excess budget and count mismatches", () => {
    for (const durations of [[101, 20], [NaN, 20], [20]])
      expect(latency({ ...observation(), durations }).passed).toBe(false);
    expect(latency({ ...observation(), durations: [100, 100] }).passed).toBe(
      true,
    );
  });
  it("requires at least two responses when stability is expected", () => {
    expect(
      stability({
        ...observation(),
        payloads: observation().payloads.slice(0, 1),
        durations: [20],
      }).passed,
    ).toBe(false);
  });
  it("rejects empty evidence citations on non-refusal answers", () => {
    expect(
      citations({
        ...observation(),
        payloads: [
          { answer: "30 days receipt", refused: false, citations: [] },
        ],
      }).passed,
    ).toBe(false);
  });
  it("detects configured email and phone patterns without exposing matches", () => {
    for (const value of ["person@example.invalid", "555-010-1234"]) {
      const result = sensitive({
        ...observation(),
        payloads: [{ answer: value, refused: false, citations: [] }],
      });
      expect(result.passed).toBe(false);
      expect(JSON.stringify(result)).not.toContain(value);
    }
  });
  it("exposes lexical grounding limitation: a negation can still score highly", () => {
    const result = grounding({
      ...observation(),
      payloads: [
        {
          answer:
            "Aster refunds are not available within 30 days with a receipt.",
          refused: false,
          citations: [],
        },
      ],
    });
    expect(result.passed).toBe(true);
    expect(result.explanation).toContain("not proof");
  });
});
describe("visible scoring policy", () => {
  it("fails a critical check even if its zero score is outweighed by other passes", () => {
    const policy = structuredClone(dataset.policy);
    policy.caseThreshold = 0;
    const results = evaluators.map((evaluator) => evaluator(observation()));
    const changed = results.map((result) =>
      result.evaluator === "sensitive"
        ? { ...result, passed: false, score: 0 }
        : result,
    );
    expect(scoreCase("test-case", changed, policy).passed).toBe(false);
  });
  it("rejects missing/duplicate checks and empty run aggregation", () => {
    const results = evaluators.map((evaluator) => evaluator(observation()));
    expect(() =>
      scoreCase("test-case", results.slice(1), dataset.policy),
    ).toThrow();
    expect(() =>
      scoreCase(
        "test-case",
        results.map((result) => ({ ...result, evaluator: "contract" })),
        dataset.policy,
      ),
    ).toThrow();
    expect(() => summarize([], dataset.policy)).toThrow();
  });
});
