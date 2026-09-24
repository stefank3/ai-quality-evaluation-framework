# Repository working agreement

This repository is a synthetic AI evaluation study project. Work within the current requested milestone; do not add infrastructure, live CI, model judges or private data.

- Use Node >=24.13 <25 and npm >=11 <12. Install with `npm ci --ignore-scripts`.
- Keep deterministic tasks offline. Do not contact providers without separate explicit authorization.
- Run `npm run validate` before committing. The full synthetic evaluation intentionally exits 1; validation checks that outcome. Tests must verify exact expected faults.
- Keep module-level educational comments and concise TSDoc accurate. Explain side effects, boundaries and failure behavior; never print secrets or raw provider exceptions.
- Maintain `docs/code-walkthrough.md` inventory for every maintained file. Keep source files below 350 lines unless reviewed and justified.
- Do not edit generated lockfiles or PDFs manually. Update Markdown and run `npm run docs:pdf` separately when the workbook changes.
- Runtime reports, credentials, editor state and dependencies stay ignored. Example reports must be generated from final source.
- Live requests require explicit opt-in, HTTPS, bounded calls, no redirects/retries and safe errors. CI guards must remain in both config and adapter.
- Commit only related work; never merge, release or deploy without authorization.

See [architecture](docs/architecture.md), [security](docs/security.md) and [test strategy](docs/test-strategy.md) for implementation-backed decisions.
