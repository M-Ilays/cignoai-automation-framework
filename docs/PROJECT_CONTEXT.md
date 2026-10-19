# Cigno FE QA — Project context for Cursor / AI assistants

Use this document when starting a **new chat** on this repository. It describes what the project is, how tests are organized, how to run them, environment prerequisites, and where to look when fixing failures (especially deliverable flows).

---

## 1. What this repository is

| Item | Detail |
|------|--------|
| **Name** | `cigno-fe-qa` — Playwright E2E automation for the **Cigno** web app (consulting deliverable product) |
| **Stack** | TypeScript, `@playwright/test` 1.6x, Page Object Model, Allure + HTML reports |
| **App under test** | Cigno dashboard: clients, projects, deliverables, Brief → Settings → Deliverable storyline workflow |
| **Auth** | Auth0 login; session stored in `src/cookies/admin.json` (cookies-only runs by default) |
| **Workspace path** | Typically `d:\Cigno_FE_QA` (Windows) |

This is **not** the FreedomPop framework referenced in `skills/` — that folder is a **workspace skill template**. This repo has its own conventions (see `docs/FRAMEWORK_ALIGNMENT.md`). Follow **this repo’s** patterns first; use `skills/` only where aligned.

---

## 2. Repository layout (mental map)

```text
Cigno_FE_QA/
├── playwright.config.ts          # BASE_URL, storageState, Chromium project, reporters
├── playwright.global-setup.ts    # Session expiry warnings
├── playwright.default-session.ts
├── src/
│   ├── config/.env               # BASE_URL, EMAIL, PASSWORD (not committed — create locally)
│   ├── cookies/admin.json        # Saved session (refresh via test:refresh-session)
│   ├── specs/                    # Thin tests only — orchestration + logTestCaseData
│   ├── page/                     # Page objects + *-flow.page.ts workflow orchestrators
│   ├── data/                     # Test data keyed by case id (e.g. 001-NewDeliverableEditsSync)
│   ├── interface/                # TypeScript interfaces (@interface alias)
│   ├── utilities/                # Helpers (session, test logging, export content, scroll)
│   └── fixtures/page.fixtures.ts # Injects page/flow instances into specs
├── docs/
│   ├── AUTOMATION_COVERAGE_TC001-TC017.md   # What each TC asserts
│   ├── FRAMEWORK_ALIGNMENT.md             # Repo vs workspace skill alignment
│   └── PROJECT_CONTEXT.md                   # This file
├── skills/                       # Workspace Playwright skill (reference, not app code)
└── test-results/                 # Traces, videos, error-context.md on failure
```

### Path aliases (use these in imports)

| Alias | Path |
|-------|------|
| `@page/*` | `src/page/*` |
| `@data/*` | `src/data/*` |
| `@interface/*` | `src/interface/*` |
| `@interfaces/*` | `src/interface/*` (alias) |
| `@utilities/*` | `src/utilities/*` |
| `@fixtures/*` | `src/fixtures/*` |

---

## 3. Architecture rules (must follow)

1. **Specs are thin** — `src/specs/**/*.spec.ts` call a flow page or fixture; no raw locators in specs.
2. **Page objects** — locators and UI actions live in `src/page/**`.
3. **Flow pages** — multi-step workflows (e.g. `deliverable-edits-sync-flow.page.ts`) sequence steps with `test.step`.
4. **Data** — scenario + `testCaseData` in `src/data/**`; lookup by key like `'001-NewDeliverableEditsSync'`.
5. **Interfaces** — `src/interface/**` for scenario shapes.
6. **Do not commit** `.env` or secrets; do not run `git config` changes unless the user asks.
7. **Commits / PRs** — only when the user explicitly requests.
8. **Prefer minimal diffs** — fix the root cause; avoid unrelated refactors.

---

## 4. Running tests

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run test:refresh-session` | Auth0 login → refresh `src/cookies/admin.json` (when session expired) |
| `npm run test` | Full Chromium suite |
| `npm run test:fast` | Excludes `@slow` (TC-008, TC-015–TC-017) |
| `npm run test:slow` | Only `@slow` deliverable flows |
| `npx playwright test --grep "TC-017" --project=Chromium` | Single case by ID in title |
| `npx playwright show-trace test-results/.../trace.zip` | Debug failure |
| `npm run allure:generate` | Allure report (needs `allure-results/`) |

**Preconditions**

- `src/config/.env` with `BASE_URL`, `EMAIL`, `PASSWORD`.
- Valid cookies (global setup warns if `__session` expires).
- **Fixture data in target env:** client `automation`, project `New project`, deliverables `sample deliverable` and `New deliverable` (tests assume they exist).

**Playwright defaults**

- `workers: 1`, `fullyParallel: true` but single worker in practice for stability.
- `timeout: 60s` per test unless overridden (TC-017 sets ~35 min via `TC017_TEST_TIMEOUT_MS`).
- `expect.timeout: 30s`; `actionTimeout: 30s`.
- Video/trace: retain on failure locally; on in CI.

---

## 5. Test case index (TC-001 – TC-018)

Full detail: `docs/AUTOMATION_COVERAGE_TC001-TC017.md`.

| ID | Area | Spec | Tags | Speed |
|----|------|------|------|-------|
| TC-001 | Login / session | `setup/login.setup.spec.ts` | `@setup` | setup only |
| TC-002 | Create client | `client/create-client.spec.ts` | `@smoke` | fast |
| TC-003–004 | Client search | `client/client-search.spec.ts` | `@search` | fast |
| TC-005 | Empty client form | `client/client-empty-form.spec.ts` | `@negative` | fast |
| TC-006 | Client + project | `client/create-client-and-project.spec.ts` | `@smoke` | fast |
| TC-007 | Sidebar tree | `client/client-project-tree-search.spec.ts` | `@tree` | fast |
| TC-008 | Dashboard deliverable E2E | `deliverable/create-deliverable-from-dashboard.spec.ts` | `@slow` | slow |
| TC-009 | Stage navigation | `deliverable/deliverable-stage-navigation.spec.ts` | `@navigation` | fast |
| TC-010 | New deliverable settings + Generate | `deliverable/new-deliverable-settings.spec.ts` | `@settings` | fast |
| TC-011 | — | **Not implemented** | — | — |
| TC-012 | Improve My Brief | `deliverable/improve-my-brief.spec.ts` | `@brief` | fast |
| TC-013 | Settings source upload | `deliverable/deliverable-z-settings-source.spec.ts` | `@source-upload` | fast |
| TC-014 | Chat assistant | `deliverable/chat-assistant.spec.ts` | `@chat` | fast |
| TC-015 | Export PPTX | `deliverable/deliverable-export.spec.ts` | `@slow @export` | slow |
| TC-016 | Export loader | `deliverable/deliverable-export-loader.spec.ts` | `@slow @loader` | slow |
| TC-017 | Edits sync | `deliverable/deliverable-edits-sync.spec.ts` | `@slow @sync` | slow |
| TC-018 | Read/update New deliverable | `deliverable/deliverable-read-update.spec.ts` | `@read-update` | fast |

**Shared sidebar fixture (most deliverable tests)**

- Client: `automation`
- Project: `New project`
- Deliverables: `New deliverable` (generation flows) or **`sample deliverable`** (pre-built storyline, export-ready)

---

## 6. Deliverable product model (for automation)

### Editor stages (stepper)

Typical flow: **1. Brief** → **2. Settings** → **3. Deliverable** (output).

- Navigation: `DeliverableStageNavigationPage` (`navigateToStage`, `navigateToDeliverableStageDirect`).
- **Export** button on Deliverable output = storyline ready enough to export.
- **Generate / Reset and Regenerate** on Settings — modals must be handled (`clickGenerateWithResetIfPrompted` patterns in `DeliverablePage`).

### Sample deliverable UI (critical for TC-015–TC-017)

- Workplan is **accordion** layout, not simple horizontal tabs.
- Sections look like **`1 Executive Summary …`** with nested **Expand section** / **Collapse section** buttons.
- **Do not** click the outer accordion chrome button with regex `^1\s+Executive Summary` — it often times out or breaks layout.
- **Do** click **`Expand section`** inside the Executive Summary row.
- **Sticky notes** — textarea placeholder `Explain the business context`; label **Sticky notes**; **Update section** beside it on **Content** tab.
- Sticky notes XPath used in code:  
  `//*[normalize-space()='Sticky notes']/following::textarea[contains(@placeholder,'Explain the business context')][1]`
- Section output often includes blocks like `TITLE: Executive Summary`.

### Common failure modes

| Symptom | Likely cause | Fix direction |
|---------|----------------|---------------|
| `scrollIntoViewIfNeeded` timeout on Update section `.or(...)` chain | Page left Deliverable; chained locator waits 30s | Use `resolveVisibleUpdateSectionButton()`; call `ensureOnDeliverableContentForStickyNotes()` before click |
| Build-request toast | Section API rejects update (empty state / regen not finished) | Regenerate after Settings; wait Export + TITLE body; retry with sidebar reopen |
| Sticky notes count 0 | Panel collapsed or wrong stage | Content tab + Expand section + expand Sticky notes heading |
| Session / login redirect | Expired cookies | `npm run test:refresh-session` |
| Allure ENOENT on teardown | Missing folder | `mkdir allure-results` or `npm run clean:allure` |

---

## 7. TC-017 — current intended workflow (active work)

**Spec:** `src/specs/dashboard/deliverable/deliverable-edits-sync.spec.ts`  
**Flow:** `src/page/dashboard/deliverable/deliverable-edits-sync-flow.page.ts`  
**Pages:** `deliverable-edits-sync.page.ts`, `deliverable-export.page.ts`, `client-search.page.ts`  
**Data:** `deliverable-edits-sync.spec.data.ts` — key `001-NewDeliverableEditsSync`, **`deliverableName: 'sample deliverable'`**

### Steps implemented

1. **Setup** — `gotoAppHomeWithSession` → open **sample deliverable** (`automation` / `New project`) → Export-ready storyline.
2. **Brief + Settings** — `editBriefAndSettings` with sync marker `New edited text in Test Cigno Deliverable [run-…]`.
3. **Reset / Regenerate** — `triggerResetAndRegenerate` → `waitForFullRegenerationComplete`.
4. **Return** — Settings + Brief + Deliverable via `verifySyncRetainedAcrossViews`; verify marker retained (no deliverable Sticky notes edit in this flow).

### Key helpers (deliverable-edits-sync.page.ts)

- `editBriefAndSettings` / `editSettingsOnly` — step 1
- `triggerResetAndRegenerate` / `waitForFullRegenerationComplete` — step 2
- `verifySyncRetainedAcrossViews` — step 3

Sticky-notes helpers remain on the page object for future extension but are **not** called by the current TC-017 flow.

### Env timeout overrides

See `src/data/dashboard/deliverable/deliverable-edits-sync.timeouts.ts` — e.g. `TC017_REGENERATE_TIMEOUT_MS`, `TC017_TEST_TIMEOUT_MS`, `TC017_STICKY_NOTES_BEFORE_UPDATE_MS`.

---

## 8. Related deliverable page objects

| File | Role |
|------|------|
| `deliverable.page.ts` | Core deliverable actions, Generate, Reset, dismiss panels |
| `deliverable-stage-navigation.page.ts` | Brief / Settings / Deliverable stepper |
| `deliverable-export.page.ts` | Export, sample deliverable readiness, Executive Summary expand |
| `deliverable-export-flow.page.ts` | TC-015 orchestration |
| `client-search.page.ts` | Sidebar search, open deliverable, leave-generation dialog |
| `deliverable-edits-sync-flow.page.ts` | TC-017 orchestration |

---

## 9. How to debug a failing test

1. Read **error line** and **attachment** names in Playwright report (`workplan-executive-summary-before`, `sticky-notes-typed`, `regeneration-complete`, etc.).
2. Open **`error-context.md`** under `test-results/.../` — YAML page snapshot at failure.
3. Open **trace**: `npx playwright show-trace test-results/.../trace.zip`.
4. Grep test id: `rg "TC-017" src/`.
5. Re-run single test: `npm run test -- --grep "TC-017" --project=Chromium`.
6. If auth errors: `npm run test:refresh-session`.

---

## 10. Agent working agreements

When the user asks to **fix a failing test**:

1. Reproduce or read the latest failure output (not only conversation summary).
2. Identify **which step** failed (Setup, Settings, Regenerate, Sticky notes, Update section, sync return).
3. Confirm **which deliverable** the test uses (`sample deliverable` vs `New deliverable`).
4. Apply **minimal** page-object changes; match existing naming and `test.step` style.
5. Avoid clicking outer Executive Summary accordion; use **Expand section**.
6. Avoid long `.or()` locator chains for actions — resolve visible element first.
7. Run the targeted grep test before claiming done (TC-017 is ~6–10 min).
8. Do not create git commits unless asked.

When the user asks to **add a test**:

- Read `skills/workflows/add-test-case.md` and `docs/FRAMEWORK_ALIGNMENT.md`.
- Add: interface → data → page (+ flow if multi-step) → fixture wiring → spec with `logTestCaseData`.

---

## 11. Useful grep commands

```bash
rg "TC-017" src/
rg "sample deliverable" src/
rg "Update section" src/page/dashboard/deliverable/
rg "Expand section" src/page/dashboard/deliverable/
rg "getDeliverableEditsSyncTestCaseData" src/
```

---

## 12. Document maintenance

Update this file when:

- TC-017 flow or test data changes materially
- New test cases (TC-019+) are added
- Default fixture names or auth flow change
- Major locator strategy changes for sample deliverable accordion

**Related docs:** `AUTOMATION_COVERAGE_TC001-TC017.md`, `FRAMEWORK_ALIGNMENT.md`, `skills/SKILL.md`.

---

*Last updated for Cursor context: May 2026 — TC-017 on sample deliverable (Brief/Settings/regen/sync only).*
