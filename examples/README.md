# Deterministic example evidence

`deterministic-report.json` and `deterministic-report.md` are generated from the supplied implementation, complete dataset and default policy. They are **example evidence from synthetic fixtures**, not model or production results.

Reproduce with `npm run eval` (expected exit 1), then compare `reports/deterministic/report.json` and `report.md` with these files. To refresh after a reviewed change, copy those two runtime files here under the `deterministic-report` names; do not edit their contents manually. Regression tests check byte equality with freshly generated reports.

Expected outcome: 4 passing cases out of 15, failed assistant quality gate. The timestamp is a fixed reproducibility epoch. The dataset digest includes cases, knowledge and fixtures; policy has its own digest. Safe explanations omit raw responses and synthetic secret matches.
