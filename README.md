# AI Quality Evaluation Framework

A small, provider-independent framework for testing AI support assistant behavior beyond HTTP status codes. It validates response contracts, evidence, policy compliance, sensitive content, latency and repeat stability using synthetic data and deterministic fixtures.

This is an educational QA portfolio project, not evidence of a production deployment. The fictional **Aster** assistant and its knowledge base contain no customer data.

Start with the [file-by-file code walkthrough](docs/code-walkthrough.md), [technical workbook](guide/AI-Quality-Evaluation-Framework-Guide.md), [PDF workbook](guide/AI-Quality-Evaluation-Framework-Guide.pdf) and [interview guide](docs/interview-guide.md).

## Architecture

```text
CLI -> validated config -> JSONL + knowledge + fixtures + policy
    -> ModelAdapter -> 10 independent evaluators
    -> weighted scoring + all-evaluator gates -> JSON/Markdown -> exit code
```

A test-focused modular monolith keeps dataset boundaries, adapters, measurements, aggregation and reporting separate without operational infrastructure. Node 24, strict TypeScript, Zod and Vitest support a small, inspectable design. See [architecture](docs/architecture.md).

## Clean-clone setup

Install Node **>=24.13 <25** and npm **>=11 <12**, then run from the repository root:

```sh
git clone https://github.com/stefank3/ai-quality-evaluation-framework.git
cd ai-quality-evaluation-framework
git checkout main
npm ci --ignore-scripts
npm run doctor
npm run validate
```

Installation requires npm registry access; deterministic execution after installation does not. No provider credentials are required. `--ignore-scripts` disables dependency lifecycle scripts; the selected packages run without them on supported platforms. The exact dependency resolution is committed in `package-lock.json`.

## Commands

| Command                                  | Contract                                                             |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `npm run doctor`                         | Check supported Node and local lockfile                              |
| `npm run format`                         | Format maintained supported text files                               |
| `npm run format:check`                   | Verify formatting without edits                                      |
| `npm run lint`                           | ESLint checks                                                        |
| `npm run typecheck`                      | Strict source and test type checking                                 |
| `npm test`                               | Offline unit, contract, regression, CLI and boundary tests           |
| `npm run eval`                           | Full deterministic fault dataset; **expected exit 1**                |
| `npm run eval -- --case grounded-answer` | Passing deterministic example; exit 0                                |
| `npm run eval:list`                      | List validated case IDs and categories                               |
| `npm run eval:live`                      | Fails with exit 2 unless explicitly authorized and configured        |
| `npm run build`                          | Compile source to ignored `dist/`                                    |
| `npm run check:repository`               | Inventory, relative links, comments, size, secrets and CI checks     |
| `npm run docs:pdf`                       | Build and validate PDF with optional local Python tooling            |
| `npm run validate`                       | Primary deterministic engineering gate; expects fault-dataset exit 1 |

Exit 0 means successful command/passing quality gate; 1 means failed gate/check; 2 means evaluation configuration, adapter or file failure. Commands reject unsupported arguments. See [running evaluations](docs/running-evaluations.md).

## Example evidence

The 15-case corpus includes **4 passing cases and 11 deliberately failing cases**. Failure examples include omitted concepts, invented citations, unsupported claims, inappropriate refusal, instruction disclosure, synthetic secret/PII leakage, malformed responses, latency and instability.

The framework regression gate passes only when those expected failures are detected. The assistant quality gate for the full corpus remains **FAIL**. These are different questions: “does the test tool detect known faults?” and “does the evaluated response set meet policy?”

See [generated example JSON](examples/deterministic-report.json) and [Markdown](examples/deterministic-report.md). Runtime reports go to ignored `reports/deterministic/` or `reports/live/`. The fixed deterministic timestamp is a reproducibility epoch, not an execution time.

## Deterministic and live lanes

Deterministic commands install a network-denial preload for fetch, sockets, HTTP(S), HTTP2, DNS and UDP entry points. CI runs only `npm run validate`, without credentials. The optional live adapter has separate authorization, HTTPS, no redirects/retries, request/body/call bounds and sanitized errors. It refuses CI execution. It has only been tested with in-memory transports, not an external AI provider.

Read [security](docs/security.md) before considering live use. No live run is part of installation, validation or PDF generation.

## Study guide and PDF

The [Markdown workbook](guide/AI-Quality-Evaluation-Framework-Guide.md) is canonical; the [PDF](guide/AI-Quality-Evaluation-Framework-Guide.pdf) is generated locally with ReportLab, without a browser or network requests. Python tooling is isolated from npm validation:

```sh
python -m pip install -r guide/requirements.txt
npm run docs:pdf
```

Dependency installation needs network access; PDF generation does not. Set `PYTHON` to a Python executable if it is not on PATH. [PDF verification notes](docs/pdf-evidence.md) record the separate artifact checks.

## Limits

Lexical overlap is not semantic entailment. Phrase matching misses paraphrases and can misread negation. PII patterns are examples, not comprehensive detectors. Two matching fixture responses say nothing about a model's long-run stability. Passing never proves that an AI system is safe or correct. Probabilistic live sampling and human review are separate activities outside required CI.

MIT licensed. See [test strategy](docs/test-strategy.md), [extension procedures](docs/adding-cases-and-evaluators.md) and the deliberately bounded [roadmap](docs/roadmap.md).
