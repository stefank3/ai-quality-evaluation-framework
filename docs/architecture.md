# Architecture

The framework is a test-focused modular monolith. One Node process loads local synthetic inputs, obtains responses through a small adapter interface, evaluates them and writes reports. No database, service, queue, browser, container or cloud account is needed.

```text
scripts/tasks.mjs  [offline preload for deterministic commands]
  src/cli.ts
    config.ts -> dataset.ts -> domain.ts + policy.ts
    adapters/fixture.ts OR explicitly authorized adapters/live.ts
    runner.ts -> evaluators.ts -> policy.ts
    reports.ts -> reports/<lane>/report.json + report.md
    process.exitCode = 0 | 1 | 2
```

## Boundaries and ownership

Zod validates configuration, cases, documents, requests, response structure, policy and output reports. `ModelAdapter.generate` intentionally returns `unknown` payloads: declaring every transport output a `ModelResponse` would hide the very malformed-response risk being tested. The transport envelope owns latency; the response payload cannot report its own timing.

The runner sends only case ID, user input and approved knowledge to adapters. Expectations, prohibited patterns and scoring policy remain evaluator concerns. Every adapter call receives a copy. Payloads and observations are copied before measurement; fixture construction and returned responses are isolated from caller mutation.

Evaluators are pure, composable functions. The registry applies ten independent responsibilities in a stable order. Scoring requires exactly one result per evaluator, combines visible weights, and applies critical overrides. Reports contain safe metadata and measurements, never raw prompt/answer text.

## Technology decisions

- Node 24 supplies fetch, AbortController, structuredClone and process tooling.
- Strict TypeScript makes contracts navigable; it does not replace boundary validation.
- Zod shares runtime schemas and inferred types. Strict objects reject unexpected fields.
- JSONL makes each synthetic case independently reviewable in version control.
- Vitest supports fast unit tests and real CLI subprocess tests in one test architecture.
- npm's generated lockfile pins transitive dependencies. Dependency lifecycle scripts are disabled during installation.
- ReportLab/Python is optional documentation tooling. It avoids a browser download and remains outside `validate` and runtime dependencies.

Primary references: [Zod requirements](https://zod.dev/), [Vitest setup](https://vitest.dev/guide/), [Node documentation](https://nodejs.org/docs/latest-v24.x/api/). Compatibility was also checked through npm package peer metadata; TypeScript 6.0.3 matches typescript-eslint's supported range.

## Reproducibility

Dataset digest covers parsed cases, knowledge and fixtures; policy has a separate digest. This means changing fixture answers or evidence changes report identity. Formatting-only JSON changes do not change the parsed-content digest. Case order and object key order remain significant. Deterministic metadata uses a fixed epoch and fixed fixture durations; live metadata uses execution time and measured duration.

The full corpus intentionally fails quality gates. Regression tests assert exact failing evaluator IDs and passing cases. No “expected failure” exemption changes the assistant's quality score. The outer engineering validation accepts exit 1 only for this particular supplied fault corpus after its regression tests pass.
