# Security boundaries

All shipped content is fictional Aster support material. Protected instruction and secret markers are deliberately public synthetic strings, not credentials. Email/phone fixtures are synthetic. No Release Signal material, private product logic, production records or external dataset is used.

## Default-deny execution

The default adapter is a local fixture adapter. Deterministic npm tasks use a network-denial preload and propagate it to Node child processes. Tests explicitly probe blocked APIs. This prevents accidental egress through the covered main-process and Node child-process paths; it is not an OS sandbox against hostile dependencies, native code or arbitrary non-Node child executables. Worker threads are not part of the framework's supported execution model; Vitest uses process forks. Installation requires registry access and is separate from offline execution.

The live adapter is imported only after validated live configuration. Both config and adapter reject CI environment markers. It requires exact opt-in, explicit HTTPS endpoint/model, bounded case count and timeout. No redirects, retry loop, localhost HTTP exception or live CI schedule exists. The endpoint is user-authorized, not an allowlist; never set it to a service you are not authorized to call.

## Data minimization

Only synthetic user input and approved knowledge travel to an authorized provider. Expectations and scoring rules remain local. The synthetic protected instruction is included to make disclosure testing meaningful. Request authorization stays in memory; errors, reports and console output exclude headers, keys, raw inputs and response text.

Provider failure bodies are canceled and never surfaced. Success-body reads are bounded to 64 KiB and share the timeout. File input is bounded to one MiB, 100 cases and field-specific limits. PII regexes are fixed choices rather than untrusted regular expressions. Reports use validated case IDs and fixed evaluator explanations.

## Distinct text normalization policies

Ordinary required/prohibited phrases use NFKC, lowercase and space-separated Unicode letter/digit tokens with whole-word phrase boundaries. This avoids substring false positives. Synthetic secrets and protected instruction markers use a dedicated path: NFKC, lowercase, removal of invisible Unicode format characters and all non-letter/non-digit separators, followed by nonempty substring matching. Adjoining letters/digits, zero-width format characters, hyphens and dots therefore cannot hide a configured marker. This deliberate aggressiveness is limited to markers; it is not semantic, encoding or homoglyph detection. PII regexes retain their separate limitations.

## Threats and residual risk

- A prompt-injection test checks marker leakage/task phrases. It cannot establish resistance to arbitrary attacks.
- Citation membership checks existence in the approved context. It cannot prove cited text supports each claim.
- Grounding uses token overlap. Negation, misleading composition and copied terms can pass it.
- Regex PII detection misses many formats/languages and can have false positives.
- Configured live model sampling may incur provider costs; limits bound request count, not provider billing policy.
- Live provider compatibility is tested only using local transport fakes. No claim of real endpoint acceptance is made.
- Reports omit raw text for privacy, so debugging requires reviewing local synthetic fixtures and case specifications.

## Repository controls

Dependencies are pinned and lockfile-generated. Installation disables lifecycle scripts. Runtime outputs, `.env` variants, dependencies and editor directories are ignored. The repository audit scans maintained text for common secret patterns; it is a limited heuristic, not a guarantee. CI has read-only contents permission, no provider secrets and no automatic live lane. Never commit credentials or change these boundaries to make a failing test pass.
