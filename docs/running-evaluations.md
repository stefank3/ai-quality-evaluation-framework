# Running evaluations

Run every command from the repository root on Node >=24.13 <25 and npm 11. Install the exact lockfile with `npm ci --ignore-scripts`. `npm run doctor` checks Node and the local lockfile; it does not validate provider credentials or contact a server.

## Deterministic lane

```sh
npm run eval:list
npm run eval -- --case grounded-answer
npm run eval
```

The selected passing case returns 0. The full 15-case deliberate fault corpus returns 1, with 4 passes and 11 failures. Reports overwrite `reports/deterministic/report.json` and `report.md`. They include every evaluator result, safe explanations, policy/dataset digests, adapter identity, aggregate score, verdict and limitations.

`--case ID` is the only selection option. Unknown IDs and extra arguments return 2. Inputs are fixed local repository files, not arbitrary CLI paths. JSONL rows must be nonempty; the loader limits file size, row count and field sizes. Blank interior lines, duplicate IDs, missing context and mismatched fixture keys fail validation.

Use `npm run validate` for the framework engineering gate. Do not change `npm run eval` to return success merely because its failures were expected by regression tests.

## Optional live lane

This repository's implementation and required validation never ran a live evaluation. The adapter is designed for a manually authorized OpenAI-compatible chat-completions endpoint. Provider compatibility is unverified beyond local contract tests.

Before a separate authorized run, provide all of these environment values in your local shell:

| Variable             | Requirement                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `AI_EVAL_LIVE`       | Exactly `I_AUTHORIZE_LIVE`                                                  |
| `AI_EVAL_ENDPOINT`   | Explicit full HTTPS chat-completions URL; no credentials, query or fragment |
| `AI_EVAL_MODEL`      | Explicit model identifier                                                   |
| `AI_EVAL_MAX_CASES`  | Integer 1–20; selection exceeding it is rejected                            |
| `AI_EVAL_TIMEOUT_MS` | Integer 100–30000, per request including body read                          |
| `AI_EVAL_API_KEY`    | Optional for endpoints that require bearer authorization; never logged      |

Then the separately authorized command is `npm run eval:live -- --case grounded-answer`. This is documentation, not authorization to execute it. A call with no opt-in returns 2 before any request. Setting either `CI` or `GITHUB_ACTIONS`, even to an empty string, denies the live lane.

HTTPS is mandatory, including localhost; there is no insecure development exception. Redirects are disabled. There are zero retries. Concurrency is one. Each stable case makes two requests, others one; the adapter also caps calls at twice the configured case limit. Success bodies are limited to 64 KiB. Provider error bodies are canceled rather than logged. JSON response content remains untrusted and goes through evaluators.

Live reports are separate under `reports/live/`; they do not replace deterministic examples. A provider transport failure aborts the run with safe error code 2; it does not produce a partial-success report.

## Troubleshooting

- Engine mismatch: install Node 24.13 or newer within major 24, with npm 11.
- Missing packages: run `npm ci --ignore-scripts`; do not remove or hand-edit lock entries.
- `FAIL: 4/15`: expected for the full corpus; inspect per-case results.
- `DATASET`: inspect local rows, IDs, references and fixtures; detailed raw values are intentionally not printed.
- Windows child-process restrictions: run in a shell that permits local Node/Vitest subprocesses; do not disable the repository offline preload.
- PDF dependency error: install `guide/requirements.txt` in the Python selected by `PYTHON`.
