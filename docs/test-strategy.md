# Test strategy

Tests prove bounded implementation behavior, not deployed model quality. Required tests cannot contact a provider and need no credentials.

| File                       | Level and risk                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `tests/evaluators.test.ts` | Unit: normalization, strict schemas, all checks, malformed payloads, score and critical override            |
| `tests/regression.test.ts` | Integration: dataset integrity, exact fault oracle, report reproducibility, fixture mutation isolation      |
| `tests/boundaries.test.ts` | Contract/boundary: opt-in, CI rejection, unsafe URLs, request shape, errors, timeouts, size and call bounds |
| `tests/cli.test.ts`        | CLI integration: real process exits, listing, live denial and network-denial entry points                   |

The regression oracle is an explicit mapping of case IDs to failing evaluator IDs. It is not generated from implementation output. A check disappearing, weakening or becoming over-sensitive changes this mapping and fails the suite. A negation example deliberately demonstrates that grounding overlap can pass a false statement.

## Isolation

`scripts/tasks.mjs` propagates the offline preload through `NODE_OPTIONS`; Vitest also loads it in worker setup. CLI tests explicitly preload it. Network probes call APIs only after replacement, so tests never intentionally reach a remote host. In-memory `fetch` functions exercise the live adapter contract; they return local `Response` objects or reject locally.

The preload is an accidental-egress guard, not an OS sandbox against malicious dependencies. Installation downloads packages; malicious native code or arbitrary child executables are outside this guard. Review dependencies and use a separate OS network policy if evaluating untrusted code. None of the authored deterministic evaluation code opens a socket.

## Gates

`npm run validate` runs doctor, format check, lint, typecheck, tests, build, repository checks, list and deterministic evaluation. All engineering steps must return zero. The full deliberate dataset must return one; its exact failures are already checked by regression tests. A runtime/configuration error returns two and cannot be mistaken for the expected quality-gate failure.

PDF generation is validated separately because Python and rendering tools are optional. CI installs with `npm ci --ignore-scripts` and uses the same primary validation command. Its token is read-only, credentials are not persisted in the checkout, and no live command or provider secret appears in the workflow.

## Adding meaningful tests

Test a risk or boundary, not a line count. Include positive controls so an always-failing evaluator cannot pass a test. Include negative controls so an always-passing evaluator cannot pass. For new adapters, test malformed transport envelopes, request isolation, sanitization and concurrency/time limits without actual network. Keep human review and probabilistic sampling outside the deterministic success claim.
