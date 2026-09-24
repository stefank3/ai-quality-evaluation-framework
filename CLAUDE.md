# Contributor instructions

Follow [AGENTS.md](AGENTS.md) as the single repository working agreement. Read the [code walkthrough](docs/code-walkthrough.md) before modifying flow boundaries.

All data is synthetic. `npm run validate` is the required engineering gate. Never interpret the deliberate dataset's failed quality gate as a broken validator or silently weaken scoring to make it green. Do not run the live lane without separate explicit user authorization. Update code, tests, study material and inventory together.
