# Code walkthrough

## Recommended study order

Read README, `src/domain.ts`, the three data files, `src/adapters/fixture.ts`, `src/evaluators.ts`, `config/policy.json`, `src/policy.ts`, `src/runner.ts`, `src/reports.ts`, then tests. Study the live adapter only after understanding the offline flow.

## Complete flow

1. `scripts/tasks.mjs` selects a local command and injects `scripts/offline.mjs` into deterministic Node processes. Live is an explicit separate entry.
2. `src/cli.ts` calls `parseConfig`: only eval/list/live and optional stable case ID are accepted. Live settings must be explicit, HTTPS and outside CI.
3. `loadDataset` reads bounded fixed paths; schemas validate JSONL, knowledge, fixture envelopes and policy. Cross-record checks reject duplicate IDs, missing references and fixture mismatches. Digests cover parsed data and policy separately.
4. `FixtureAdapter` returns fresh copies and fixed durations. `LiveAdapter`, only when authorized, sends minimum context with built-in fetch, times requests, limits body/calls/concurrency and sanitizes failures.
5. `runEvaluation` selects cases, clones requests and collects one response or two when stability is required. It passes isolated observations to every evaluator.
6. The ten evaluators check contract, required concepts, prohibited content, citation membership, lexical grounding, refusal flag, synthetic injection, sensitive patterns, reported latency and normalized repeat stability. Dependent checks fail closed on malformed payloads; latency remains independent.
7. `scoreCase` computes weighted mean and requires every evaluator to pass, with critical failures still unconditional and the case score threshold retained. `summarize` requires all cases and the run score to pass. Policy is versioned JSON, not hidden code constants.
8. `writeReports` validates the complete report and writes JSON/Markdown under a lane-specific ignored directory. Console output is a concise verdict. Exit 0 passes, 1 fails the quality gate, 2 indicates safe configuration/transport/file failure.

## Passing example

`grounded-answer` asks about refunds using `kb-refunds`. The fixture repeats “Aster refunds are available within 30 days with a receipt.” with an approved citation and 20 ms duration. Required phrases appear, no prohibited marker appears, lexical evidence overlap is 1, refusal is false, both signatures match and all ten checks pass. The case score is 1 and `npm run eval -- --case grounded-answer` returns 0.

`appropriate-refusal` uses only `kb-privacy`, refuses private records or secrets and cites that approved privacy document. All ten evaluators pass. The regression test verifies the actual adapter context as well as the response and verdict.

`deterministic-regression` intentionally duplicates the grounded refund baseline as a named stability control paired with `unstable-response`: it checks repeat signature equality and reproducible reports, not additional knowledge or behavior coverage.

## Failing example

`invented-citation` has the same otherwise correct answer but cites `kb-invented`. Contract validation passes because the ID has valid syntax. Citation validity fails because it is absent from approved context. The score loses one of thirteen weight units; the critical citation flag independently forces failure. This distinction demonstrates structural validity versus grounded evidence. The CLI returns 1.

`malformed-response` returns a numeric answer and string refusal flag. Nine content/structure checks fail closed; latency still passes because the fixture reports a valid 20 ms duration. No unsafe casting turns the malformed payload into an accepted response.

## Tests and network denial

Unit tests target normalization, schemas, every evaluator and scoring. Integration regression tests assert an explicit per-case failure map, reproducibility and mutable-data isolation. Adapter contract tests inject in-memory fetch functions, including local timeout and error scenarios. CLI tests launch real subprocesses for exit-code and network-guard behavior.

Vitest setup and deterministic task children load the network guard. Network-denial tests call replaced APIs, not an actual service. The guard is designed for accidental egress, not hostile code. CI additionally refuses the live lane in both config and adapter.

## Extension points

Add cases in JSONL and fixtures, then extend the explicit regression oracle. Add evaluators to the ID schema, registry, policy, report cardinality and tests. Add adapters through `ModelAdapter`, updating safe identity/lane validation and contract tests. Add report formats as pure functions of the validated report. See [extension procedures](adding-cases-and-evaluators.md).

## Maintained file tree

The following inventory is a file tree in path order, with one responsibility per file. Generated lockfile, PDF and example reports are listed because they are committed evidence. Runtime directories (`dist`, `reports`, `tmp`, `node_modules`) are excluded. The repository checker requires every maintained path to appear here.

<!-- INVENTORY -->

- `.editorconfig` - Defines shared indentation, encoding and line-ending conventions.
- `.gitattributes` - Normalizes text line endings and treats the generated PDF as binary.
- `.github/workflows/validate.yml` - Runs least-privilege deterministic validation on pushes and pull requests.
- `.gitignore` - Excludes credentials, dependencies, runtime reports, builds and editor state.
- `.node-version` - Selects Node major 24 for version managers and CI.
- `.npmrc` - Requires compatible engines, exact direct saves and no implicit audit/funding requests.
- `.prettierignore` - Keeps generated evidence and runtime artifacts out of formatting edits.
- `AGENTS.md` - States the contributor working agreement and validation/security boundaries.
- `CLAUDE.md` - Routes alternate coding assistants to the shared repository agreement.
- `LICENSE` - Grants the MIT license for this repository.
- `README.md` - Introduces the problem, architecture, clean setup, commands, evidence and study links.
- `config/policy.json` - Versions every evaluator weight, critical flag and aggregation threshold.
- `data/cases.jsonl` - Contains fifteen validated synthetic assistant behavior specifications.
- `data/fixtures.json` - Defines deterministic response payloads, repeats and fixed durations.
- `data/knowledge.json` - Provides the small fictional Aster knowledge base with stable document IDs.
- `docs/adding-cases-and-evaluators.md` - Explains implementation-backed extension procedures for cases, checks, adapters and reports.
- `docs/architecture.md` - Explains module boundaries, technology choices and reproducibility decisions.
- `docs/code-walkthrough.md` - Traces the complete flow, examples, extension points and every maintained file.
- `docs/interview-guide.md` - Provides truthful design explanations, evaluator limits and a five-minute demonstration.
- `docs/pdf-evidence.md` - Documents isolated PDF generation, structural validation and visual review.
- `docs/roadmap.md` - Separates completed scope from possible separately authorized future work.
- `docs/running-evaluations.md` - Documents command exits, dataset selection, live configuration and troubleshooting.
- `docs/security.md` - Defines trust boundaries, safe output, offline controls and residual risks.
- `docs/test-strategy.md` - Maps test levels to risks and explains the distinct engineering and quality gates.
- `eslint.config.mjs` - Configures local TypeScript lint rules and ignored generated directories.
- `examples/README.md` - Labels generated synthetic example evidence and explains byte-for-byte reproduction.
- `examples/deterministic-report.json` - Stores the generated machine-readable complete fault-corpus report.
- `examples/deterministic-report.md` - Stores the generated readable complete fault-corpus report.
- `guide/AI-Quality-Evaluation-Framework-Guide.md` - Serves as the canonical thirty-unit technical study workbook.
- `guide/AI-Quality-Evaluation-Framework-Guide.pdf` - Provides the locally generated navigable PDF workbook for study.
- `guide/requirements.txt` - Pins the isolated Python PDF generation and verification dependencies.
- `package-lock.json` - Records npm-generated exact dependency resolution and integrity data.
- `package.json` - Declares supported engines, pinned dependencies and the npm command contract.
- `scripts/check-repository.mjs` - Audits inventory, relative links, module headers, source size, secret patterns and CI separation.
- `scripts/docs_pdf.py` - Builds and validates the local reproducible PDF from canonical Markdown.
- `scripts/doctor.mjs` - Checks the supported Node runtime and presence of the exact lockfile.
- `scripts/offline.mjs` - Denies deterministic JavaScript network entry points before application imports.
- `scripts/tasks.mjs` - Dispatches portable npm tasks, propagates offline guards and enforces expected exits.
- `src/adapters/fixture.ts` - Returns isolated deterministic fixture payloads and fixed timing observations.
- `src/adapters/live.ts` - Implements explicitly authorized bounded HTTPS transport with sanitized failures.
- `src/adapters/model.ts` - Defines the provider-independent adapter and untrusted transport observation contracts.
- `src/cli.ts` - Connects validated configuration and dataset to evaluation, reports and process status.
- `src/config.ts` - Validates arguments and explicit live environment configuration before I/O.
- `src/dataset.ts` - Loads bounded files, validates cross-record relationships and computes reproducibility digests.
- `src/domain.ts` - Defines runtime schemas and inferred types for cases, evidence, responses and reports.
- `src/errors.ts` - Provides typed developer-authored safe errors without raw exception causes.
- `src/evaluators.ts` - Implements the ten pure measurement responsibilities and ordered registry.
- `src/normalize.ts` - Keeps whole-word phrase normalization separate from compact synthetic-marker substring matching.
- `src/policy.ts` - Validates policy 1.0.1 and applies weighted scores, all-evaluator case gates, critical overrides and run gates.
- `src/reports.ts` - Renders safe Markdown and writes validated JSON/Markdown to separate runtime lanes.
- `src/runner.ts` - Orchestrates sequential isolated observations, evaluation and validated report assembly.
- `tests/boundaries.test.ts` - Tests configuration and HTTP contracts using only in-memory transports.
- `tests/cli.test.ts` - Tests real CLI status codes and network denial in local subprocesses.
- `tests/evaluators.test.ts` - Tests normalization, schemas, evaluator responsibilities and scoring boundaries.
- `tests/regression.test.ts` - Tests exact corpus faults, example reproducibility, data validation and mutation isolation.
- `tsconfig.json` - Enables strict NodeNext source compilation into ignored dist output.
- `tsconfig.tests.json` - Extends strict checking to tests and Vitest configuration without emitting files.
- `vitest.config.ts` - Selects isolated test workers and the offline setup preload.
