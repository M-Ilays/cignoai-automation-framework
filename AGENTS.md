# Agent instructions — Cigno FE QA

This repository is **Playwright E2E automation** for the Cigno dashboard (TypeScript, Page Object Model).

## Start here

Before changing tests or debugging failures, read:

**[docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)**

That file contains project layout, how to run tests, TC-001–TC-018 index, deliverable UI rules (sample deliverable accordion, Sticky notes, Update section), TC-017 workflow, and debugging steps.

## Quick reference

| Task | Command / location |
|------|-------------------|
| Run one case | `npm run test -- --grep "TC-017" --project=Chromium` |
| Refresh login | `npm run test:refresh-session` |
| Fast suite (no @slow) | `npm run test:fast` |
| Coverage doc | `docs/AUTOMATION_COVERAGE_TC001-TC017.md` |
| Framework vs skills | `docs/FRAMEWORK_ALIGNMENT.md` |
| Env | `src/config/.env` (`BASE_URL`, `EMAIL`, `PASSWORD`) |
| Session cookies | `src/cookies/admin.json` |

## Rules for agents

- Specs stay thin; locators live in `src/page/`.
- Use path aliases: `@page`, `@data`, `@interface`, `@utilities`, `@fixtures`.
- Fixture sidebar: client **automation**, project **New project**, deliverables **sample deliverable** / **New deliverable**.
- **TC-017** uses **sample deliverable** — Brief + Settings edit → Reset / Regenerate → return views and verify sync (no Sticky notes step in flow).
- Prefer `resolveVisibleUpdateSectionButton()` over chained `.or()` locators for **Update section** clicks.
- Minimal diffs; no commits unless the user asks.
- Run tests to verify fixes; slow cases (TC-017) take several minutes.

## Workspace skills folder

`skills/` is a Playwright reference template (FreedomPop-style). Follow **this repo’s** code and `docs/PROJECT_CONTEXT.md` first; align with `docs/FRAMEWORK_ALIGNMENT.md` where noted.
