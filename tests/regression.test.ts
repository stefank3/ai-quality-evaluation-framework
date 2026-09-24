/** Dataset/regression and mutable-boundary tests at integration level. Network prohibited;
 * uses real loader, fixture adapter, evaluators and reporting with no report writes.
 * The deliberate fault corpus must fail its AI quality gate while these tests pass. */
import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { loadDataset, parseDataset } from "../src/dataset.js";
import { FixtureAdapter } from "../src/adapters/fixture.js";
import { runEvaluation } from "../src/runner.js";
import { markdownReport } from "../src/reports.js";
const dataset = await loadDataset();
it("reproduces committed example evidence byte for byte from current implementation", async () => {
  const report = await runEvaluation(
    dataset,
    new FixtureAdapter(dataset.fixtures),
  );
  expect(await readFile("examples/deterministic-report.json", "utf8")).toBe(
    `${JSON.stringify(report, null, 2)}\n`,
  );
  expect(await readFile("examples/deterministic-report.md", "utf8")).toBe(
    markdownReport(report),
  );
});
const expected = {
  "grounded-answer": [],
  "missing-concept": ["required"],
  "invented-citation": ["citations"],
  "unsupported-claim": ["grounding"],
  "appropriate-refusal": [],
  "inappropriate-refusal": ["required", "grounding", "refusal"],
  "injection-resisted": [],
  "injection-overridden": ["required", "prohibited", "grounding", "injection"],
  "synthetic-secret": ["sensitive"],
  "malformed-response": [
    "contract",
    "required",
    "prohibited",
    "citations",
    "grounding",
    "refusal",
    "injection",
    "sensitive",
    "stability",
  ],
  "latency-violation": ["latency"],
  "deterministic-regression": [],
  "unstable-response": ["stability"],
  "prohibited-content": ["prohibited"],
  "synthetic-pii": ["sensitive"],
};
it("detects the exact intended evaluator failures for every supplied synthetic case", async () => {
  const report = await runEvaluation(
    dataset,
    new FixtureAdapter(dataset.fixtures),
  );
  expect(
    Object.fromEntries(
      report.cases.map((item) => [
        item.caseId,
        item.results
          .filter((result) => !result.passed)
          .map((result) => result.evaluator),
      ]),
    ),
  ).toEqual(expected);
  expect(report.summary.passed).toBe(4);
  expect(report.summary.gatePassed).toBe(false);
  expect(
    report.cases.filter((item) => item.passed).map((item) => item.caseId),
  ).toEqual([
    "grounded-answer",
    "appropriate-refusal",
    "injection-resisted",
    "deterministic-regression",
  ]);
});
it("reproduces identical complete JSON and Markdown reports across fresh adapters", async () => {
  const first = await runEvaluation(
    dataset,
    new FixtureAdapter(dataset.fixtures),
  );
  const second = await runEvaluation(
    dataset,
    new FixtureAdapter(dataset.fixtures),
  );
  expect(first).toEqual(second);
  expect(markdownReport(first)).toBe(markdownReport(second));
  expect(JSON.stringify(first)).not.toContain("SYNTHETICSECRETALPHA000");
});
it("isolates original fixtures and returned responses from caller mutations", async () => {
  const fixtures = structuredClone(dataset.fixtures);
  const adapter = new FixtureAdapter(fixtures);
  const request = {
    caseId: "grounded-answer",
    input: "refunds",
    context: dataset.documents,
  };
  const first = await adapter.generate(request);
  const original = structuredClone(first);
  if (typeof first.payload === "object" && first.payload !== null)
    Object.assign(first.payload, { answer: "MUTATED" });
  delete fixtures["grounded-answer"];
  expect(await adapter.generate(request)).toEqual(original);
});
it("validates duplicate IDs, missing context, unknown fields, blank rows and fixture mismatch", () => {
  const rows = dataset.cases.map((item) => JSON.stringify(item));
  for (const lines of [
    rows.concat(rows[0] ?? "").join("\n"),
    "",
    rows.join("\n\n"),
    JSON.stringify({ ...dataset.cases[0], knowledgeIds: ["unknown-doc"] }),
  ]) {
    expect(() =>
      parseDataset(lines, dataset.documents, dataset.fixtures, dataset.policy),
    ).toThrow("Dataset");
  }
  expect(() =>
    parseDataset(rows.join("\n"), dataset.documents, {}, dataset.policy),
  ).toThrow();
  expect(() =>
    parseDataset(rows.join("\n"), dataset.documents, dataset.fixtures, {}),
  ).toThrow();
});
it("rejects an unknown case selection and unknown fixture ID instead of falling back", async () => {
  await expect(
    runEvaluation(
      dataset,
      new FixtureAdapter(dataset.fixtures),
      "unknown-case",
    ),
  ).rejects.toThrow();
  await expect(
    new FixtureAdapter(dataset.fixtures).generate({
      caseId: "unknown-case",
      input: "test",
      context: dataset.documents,
    }),
  ).rejects.toThrow();
});
it("rejects prototype-property case IDs with a safe adapter error", async () => {
  await expect(
    new FixtureAdapter(dataset.fixtures).generate({
      caseId: "constructor",
      input: "test",
      context: dataset.documents,
    }),
  ).rejects.toThrow("Adapter contract failed.");
});
it("isolates request mutations made by an adapter from the dataset and later repeats", async () => {
  const before = structuredClone(dataset);
  const fixture = dataset.fixtures["grounded-answer"];
  if (!fixture) throw new Error("Missing baseline fixture");
  const report = await runEvaluation(
    dataset,
    {
      identity: "fixture-v1",
      async generate(request) {
        expect(request.context[0]?.text).not.toBe("mutated");
        const document = request.context[0];
        if (document) document.text = "mutated";
        return {
          payload: structuredClone(fixture.payloads[0]),
          durationMs: 20,
        };
      },
    },
    "grounded-answer",
  );
  expect(report.summary.gatePassed).toBe(true);
  expect(dataset).toEqual(before);
});
