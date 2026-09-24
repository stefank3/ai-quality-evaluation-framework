# Interview guide

## Why this repository exists

An assistant can return HTTP 200 and still omit a required policy condition, cite a nonexistent document, expose data or follow an injected instruction. This repository demonstrates how to express those risks as independently measurable contracts, then report evidence with explicit limits.

It is a synthetic portfolio project. It has not served production users, measured business impact or validated a deployed model. The live adapter has only local contract tests.

## Design answers

**Why a modular monolith?** The problem is a small test pipeline. Modules give separation and test seams without services, network hops or deployment overhead.

**Why TypeScript and Zod?** TypeScript helps developers compose modules correctly; Zod validates runtime data that types cannot protect, such as JSONL and provider responses.

**Why Vitest?** One runner covers pure checks, contracts, full-dataset regression and real CLI exits. Provider calls are replaced by explicit in-memory transports.

**Why JSONL?** Each case is reviewable as a single versioned record. It is easy to extend without a database, and the loader validates cross-record relationships.

**Why fixtures instead of a real model in CI?** CI is verifying the framework's behavior. Fixtures expose known faults repeatably, without credentials, cost or provider variability. Live sampling answers a different question and is explicitly authorized outside CI.

**Why an adapter?** Provider transport details should not define the evaluator API. Payloads remain unknown until the response contract checks them.

## What each check proves

| Check              | Evidence                                                   | Does not establish                         |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------ |
| Contract           | Expected structure/types and bounded fields                | Correct answer                             |
| Required concepts  | Configured normalized phrases appear                       | Complete meaning or paraphrase equivalence |
| Prohibited content | Forbidden phrases absent                                   | Absence of all harmful language            |
| Citations          | IDs belong to approved context; non-refusals cite evidence | Claim-level support                        |
| Grounding          | Content-word overlap exceeds threshold                     | Semantic truth                             |
| Refusal            | Explicit flag matches expectation                          | Sincere or correctly worded refusal        |
| Injection          | Protected markers absent and task phrases retained         | General attack resistance                  |
| Sensitive data     | Configured marker/PII pattern absence                      | Complete privacy protection                |
| Latency            | Reported duration fits budget                              | Real production performance from fixtures  |
| Stability          | Two normalized responses match when required               | Probabilistic consistency at scale         |

## Likely questions

**How do you avoid an average hiding a dangerous failure?** Critical flags override the weighted score. Sensitive leakage fails a case even if every other check passes. The run requires every case to pass.

**Why does evaluation exit one?** The supplied corpus is a fault-detection demonstration: 11 of 15 cases deliberately fail. Regression tests assert their exact failure signatures; engineering validation expects the quality-gate failure after tests pass.

**What is the largest limitation?** Deterministic text heuristics have semantic blind spots. The tests include a negation that scores highly on grounding, documenting the limitation rather than concealing it.

**How is network access controlled?** Deterministic tasks preload guards before application imports. Live config and adapter both reject CI, require opt-in and use HTTPS with no redirects/retries and bounded calls/time. The preload is not a hostile-code OS sandbox.

**Why not use a complete evaluation library?** Implementing contracts, aggregation and reporting directly makes the design visible for study. Adopting a broader framework later would be a separate evaluated decision.

**How would you improve confidence?** Curate representative synthetic/authorized cases, add human-reviewed claim-level oracles, and conduct separately authorized repeated live sampling with explicit uncertainty. No future capability is claimed as implemented.

## Five-minute walkthrough

1. Minute 1: README problem and deterministic/live distinction; explain why HTTP status is insufficient.
2. Minute 2: open a JSONL case, its approved knowledge and fixture; identify expected behavior versus intentionally faulty output.
3. Minute 3: trace CLI to runner and one evaluator; show unknown response payload and safe error boundary.
4. Minute 4: open policy and a critical failure in the example report; explain 4/15 and the two different gates.
5. Minute 5: show regression oracle, network-denial test and PDF workbook; state semantic and production-evidence limitations.

Recommended study order: README, domain schemas, data, fixture adapter, evaluator functions, scoring, runner/reporting, CLI tests, optional live boundary, workbook exercises.
