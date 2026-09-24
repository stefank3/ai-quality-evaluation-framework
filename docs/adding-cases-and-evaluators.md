# Adding cases, evaluators and adapters

## Case

1. Add a unique stable ID to `data/cases.jsonl`, including approved knowledge IDs, behavioral expectation, concept lists, refusal flag, optional latency budget, stability flag, injection markers and PII pattern choices.
2. Add corresponding fixture payloads and fixed duration to `data/fixtures.json`. Malformed payloads are intentional only when testing the contract evaluator; the fixture envelope still must validate.
3. If evidence changes, add a document with a stable ID to `data/knowledge.json`. A reference to an unknown document fails dataset loading.
4. Add the expected failing evaluator IDs to the explicit regression oracle in `tests/regression.test.ts`. Include a positive control when adding a new failure mode.
5. Run validation; regenerate example reports and update study text if the corpus outcomes changed.

Avoid punctuation-only concepts: normalization would make them empty and they cannot match. Concepts use whole normalized phrases, not substrings, stemming or synonyms. Keep all examples synthetic.

## Evaluator

Add a pure function to `src/evaluators.ts` or a new cohesive module implementing `Evaluator`. Accept an `Observation`, return one `EvaluatorResult`, use fixed explanations and avoid embedding matches in output. Add its identity to `EvaluatorIdSchema`, registry, report result cardinality and every relevant test. Add a visible weight and critical flag to `config/policy.json`; changing policy changes its digest.

Make malformed-input behavior explicit. Current dependent checks fail closed when any repeated payload is invalid. Latency evaluates transport observations independently, because malformed content says nothing about measured duration. Explain what the new check does not prove in the guide and interview material.

## Adapter

Implement `ModelAdapter` with stable identity and `generate(request)`. Keep provider data unknown until evaluated. Extend the identity schema, lane handling and CLI only after reviewing whether the new adapter can perform network I/O. Return fresh data, honor bounded concurrency/calls/time and sanitize errors. Use an in-memory transport for contract tests. Required CI must remain offline.

## Report format

Add a pure renderer alongside `markdownReport`, consuming only validated `EvaluationReport`. Reuse the safe report schema; do not add prompts, raw answers, matched secret values or endpoint URLs for convenience. Add format tests and update output writing, walkthrough inventory and docs. Runtime outputs remain ignored.

## Workbook

Edit the canonical Markdown, then `npm run docs:pdf`. The renderer supports headings, paragraphs, bullet lists, fenced code and inline code/emphasis; keep code lines at most 88 characters. Each level-two heading starts a study unit. Do not manually edit the PDF. Validate headings/text/navigation and inspect rendered pages after layout changes.
