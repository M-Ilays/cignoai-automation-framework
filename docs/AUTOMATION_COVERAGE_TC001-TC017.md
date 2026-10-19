# Automation Coverage — Test Cases TC-001 through TC-017

| Field | Value |
|-------|--------|
| **Project** | Cigno FE QA (Playwright) |
| **Document version** | 1.0 |
| **Last updated** | 15 May 2026 |
| **Scope** | Automated end-to-end coverage for manual test cases **TC-001** through **TC-017** |
| **Audience** | QA, engineering, release stakeholders |

---

## 1. Purpose

This document describes **what the Playwright automation actually validates** for each numbered test case through **TC-017**. It is intended for coverage reviews, release sign-off, and gap analysis—not as a replacement for manual test scripts.

**Emphasis:** For every automated case, the sections below state **automation scope** (assertions, flows, data), **preconditions**, **execution profile**, and **known limitations** where automation is partial or differs from a full manual pass.

---

## 2. Executive summary

| Metric | Value |
|--------|--------|
| **Test cases in scope (TC-001–TC-017)** | 17 |
| **Automated in this repository** | **16** (TC-001–TC-010, TC-012–TC-017) |
| **Not automated yet** | **TC-011** (no spec or data in repo) |
| **Framework** | Playwright + Page Object Model, data-driven specs under `src/specs/` |
| **Authentication** | Saved session cookies by default; **TC-001** refreshes session when run explicitly |
| **Typical runtime split** | **Fast suite** (`test:fast`): TC-001–TC-007, TC-009–TC-014 · **Slow suite** (`test:slow`): TC-008, TC-015–TC-017 |

### Coverage by product area

| Area | Test cases | Automation status |
|------|------------|-------------------|
| Auth / session | TC-001 | Automated (setup project) |
| Client management | TC-002–TC-007 | Automated |
| Deliverable — dashboard E2E | TC-008 | Automated (`@slow`) |
| Deliverable — navigation & settings | TC-009–TC-010 | Automated |
| Deliverable — brief, source, chat | TC-012–TC-014 | Automated |
| Deliverable — export & sync | TC-015–TC-017 | Automated (`@slow`) |
| *(gap)* | TC-011 | **Not implemented** |

### Shared test data conventions

Many deliverable scenarios use a **stable sidebar fixture**:

- **Client:** `automation`
- **Project:** `New project`
- **Deliverable:** `New deliverable` (existing record; not created inside the test)

Deliverable tests that need generation use a **fast path**: open Settings → ensure **Client Name** → **Generate** (with **Reset storyline** / **Reset and Regenerate** modals handled) → poll until **Export** is enabled, **without** waiting for the full multi-minute brief progress bar when a shorter path is available.

---

## 3. How tests are run

| Command | What it runs |
|---------|----------------|
| `npm run test` | Full Chromium suite (respects `@slow` tags) |
| `npm run test:fast` | Excludes tests tagged `@slow` (TC-008, TC-015–TC-017) |
| `npm run test:slow` | Only `@slow` deliverable flows |
| `npm run test:refresh-session` | **TC-001** only — Auth0 login and cookie refresh |
| `npx playwright test --project=Chromium --grep "TC-015"` | Single case by ID in title |

**Preconditions for all dashboard tests (except TC-001 when refreshing session):**

- Valid cookies in the default storage state (see `playwright.default-session.ts`).
- Environment: `BASE_URL`, credentials in `src/config/.env` when refreshing session.
- For **New deliverable** flows: client **automation**, project **New project**, and deliverable **New deliverable** must exist in the target environment.

---

## 4. Coverage matrix

| ID | Summary | Automated | Spec (entry point) | Tags (primary) |
|----|---------|-----------|-------------------|----------------|
| TC-001 | Admin login / session cookies | Yes | `src/specs/setup/login.setup.spec.ts` | `@setup @login` |
| TC-002 | Create client | Yes | `src/specs/dashboard/client/create-client.spec.ts` | `@smoke @client` |
| TC-003 | Search client (positive) | Yes | `src/specs/dashboard/client/client-search.spec.ts` | `@smoke @search` |
| TC-004 | Search client (negative) | Yes | `src/specs/dashboard/client/client-search.spec.ts` | `@negative @search` |
| TC-005 | Empty new client form | Yes | `src/specs/dashboard/client/client-empty-form.spec.ts` | `@negative @form` |
| TC-006 | Create client + first project | Yes | `src/specs/dashboard/client/create-client-and-project.spec.ts` | `@smoke @project` |
| TC-007 | Sidebar client → project hierarchy | Yes | `src/specs/dashboard/client/client-project-tree-search.spec.ts` | `@tree` |
| TC-008 | Dashboard deliverable E2E | Yes | `src/specs/dashboard/deliverable/create-deliverable-from-dashboard.spec.ts` | `@slow @dashboard` |
| TC-009 | Deliverable stage navigation | Yes | `src/specs/dashboard/deliverable/deliverable-stage-navigation.spec.ts` | `@navigation` |
| TC-010 | New deliverable settings + Generate | Yes | `src/specs/dashboard/deliverable/new-deliverable-settings.spec.ts` | `@settings` |
| TC-011 | *(not defined in repo)* | **No** | — | — |
| TC-012 | Improve My Brief | Yes | `src/specs/dashboard/deliverable/improve-my-brief.spec.ts` | `@brief` |
| TC-013 | Settings source upload isolation | Yes | `src/specs/dashboard/deliverable/deliverable-z-settings-source.spec.ts` | `@source-upload` |
| TC-014 | Chat Assistant | Yes | `src/specs/dashboard/deliverable/chat-assistant.spec.ts` | `@chat-assistant` |
| TC-015 | Export PPTX vs on-screen | Yes | `src/specs/dashboard/deliverable/deliverable-export.spec.ts` | `@slow @export` |
| TC-016 | Export loader / duplicate clicks | Yes | `src/specs/dashboard/deliverable/deliverable-export-loader.spec.ts` | `@slow @loader` |
| TC-017 | Edits sync across views | Yes | `src/specs/dashboard/deliverable/deliverable-edits-sync.spec.ts` | `@slow @sync` |

---

## 5. Detailed coverage by test case

### TC-001 — Admin user login (session setup)

**Manual intent:** Verify an admin user can sign in and retain an authenticated session.

**What automation covers**

- Auth0 (or app) login using credentials from environment variables (`EMAIL`, `PASSWORD`).
- Persists **storage state** (cookies/local storage) for subsequent tests.
- Runs as the Playwright **`setup`** project when `SKIP_GLOBAL_LOGIN=false` (`npm run test:refresh-session`).

**What automation does not cover**

- Role-based access for non-admin users.
- Session expiry handling during a long test run (operators must re-run refresh-session).

**Artifacts:** `src/data/setup/login.setup.spec.data.ts`, `src/specs/setup/login.setup.spec.ts`

---

### TC-002 — Create new client

**Manual intent:** Create a client with valid details and confirm it appears in the application.

**What automation covers**

- Opens **Add Client** from the clients area.
- Fills **Name**, **Website**, **Industry**, **Description** from data (`Automation`, Daraz sample site, Marketing).
- Submits and verifies the new client is visible/selectable in the UI.

**What automation does not cover**

- Duplicate-name policies, API-level persistence, or cleanup of created clients across runs.

**Artifacts:** `src/data/dashboard/client/client.spec.data.ts`, `create-client.spec.ts`

---

### TC-003 — Search client (positive)

**Manual intent:** Search for an existing client, open from results, and confirm details display.

**What automation covers**

- Search term: **`Hassan Ahmad`**.
- Selects matching client from results.
- Asserts client context/details are shown after selection.

**Precondition:** Client **Hassan Ahmad** must exist in the target environment.

**Artifacts:** `client-search.spec.data.ts` (`001-SearchClient`), `client-search.spec.ts`

---

### TC-004 — Search client (negative)

**Manual intent:** Search for a non-existent client; verify no erroneous match; clear search.

**What automation covers**

- Search: **`non existent client`**.
- Asserts sidebar/results do not show a false positive match.
- Clears the search field and verifies reset behavior.

**Artifacts:** `client-search.spec.data.ts` (`002-SearchNonExistentClient`), `client-search.spec.ts`

---

### TC-005 — New client form — empty required fields

**Manual intent:** Open new client form, touch required fields without values; Save stays disabled; Cancel works.

**What automation covers**

- Opens empty new client form.
- Focuses required fields without entering data.
- Asserts **Save** remains disabled.
- **Cancel** closes/discards without creating a client.

**Artifacts:** `client-empty-form.spec.data.ts`, `client-empty-form.spec.ts`

---

### TC-006 — Create client and first project

**Manual intent:** Create a client, start first project via AI description path, complete review, and submit **Create Project**.

**What automation covers**

- Client: **`QA Automation Test Cigno`** (website, Technology industry).
- Project: AI description → generated name **`Test Cigno`**, date range, **Create Project** submission.
- Verifies project appears under the client in the UI flow.

**What automation does not cover**

- Long-term data cleanup; repeated runs may require unique naming strategies in shared envs.

**Artifacts:** `client-project-flow.spec.data.ts`, `create-client-and-project.spec.ts`

---

### TC-007 — Client, first project, sidebar hierarchy

**Manual intent:** After creating client + project, return home, search by **project name**, and verify **client → project** tree structure in filtered sidebar.

**What automation covers**

- Creates client (**`QA Tree Client`** + runtime uniqueness suffix) and project via AI path.
- Navigates home, searches by **project name** (runtime-generated).
- Asserts hierarchical relationship in filtered sidebar tree.

**Artifacts:** `client-project-sidebar-flow.spec.data.ts`, `client-project-tree-search.spec.ts`

---

### TC-008 — Dashboard deliverable (full E2E)

**Manual intent:** End-to-end creation from dashboard home: brief → Build → project type → deliverable mode → settings (scope, client) → **Generate** → wait until generation **Progress** completes.

**What automation covers**

- Home prompt brief: *"Develop an AI consulting market entry strategy."*
- **AI Strategy** standard project card path.
- Settings sheet: geographic/business scope, client search **`automation`**, **Generate deliverable**.
- Waits for generation progress completion (long-running; tagged **`@slow`**).

**What automation does not cover**

- Pixel-perfect slide layout; full content quality review of every section (manual).

**Typical duration:** ~10–18 minutes (environment-dependent).

**Artifacts:** `dashboard-deliverable-flow.spec.data.ts`, `create-deliverable-from-dashboard.spec.ts`

---

### TC-009 — Deliverable stage navigation and performance

**Manual intent:** On an existing deliverable, navigate **Brief ↔ Settings**, measure load, and confirm field values are retained.

**What automation covers**

- Opens existing deliverable: **`sample deliverable`**.
- Navigates between **Brief** and **Settings** stages.
- Asserts stage loads within **`maxStageLoadMs`** (15s).
- Verifies key field values persist across navigation.

**What automation does not cover**

- All deliverable types or **New deliverable** (uses sample fixture by design).

**Artifacts:** `deliverable-stage-navigation.spec.data.ts`, `deliverable-stage-navigation.spec.ts`

---

### TC-010 — Existing New deliverable — settings and Generate

**Manual intent:** Open **New deliverable** from sidebar → **Settings** → complete form → **Generate deliverable**.

**What automation covers**

- Sidebar: **automation** / **New project** / **New deliverable**.
- Fills settings: type **Recommendation**, **AI Strategy**, language, objectives, horizons, scope tags, business scope, mode consideration.
- Uploads test PDF: `src/test-data/documents/ai-market-entry-brief.pdf`.
- Ensures **Client Name** = **automation**, then **Generate** (reset modals handled).
- Confirms generation/export readiness per page object flow.

**Artifacts:** `deliverable-new-settings.spec.data.ts`, `new-deliverable-settings.spec.ts`

---

### TC-011 — Not automated

**Status:** No test case ID **TC-011** appears in `src/data` or `src/specs`. Treat as a **coverage gap** until a manual case is mapped and implemented.

**Recommendation:** Document the manual TC-011 title/steps in the test management tool, then add `testCase: 'TC-011'` in a new spec/data pair following existing patterns.

---

### TC-012 — Improve My Brief

**Manual intent:** From **Brief** stage, use **Improve My Brief**, submit intent, wait for AI refinement, and continue generation flow.

**What automation covers**

- **New deliverable** under **automation** / **New project**.
- Seeds brief text; invokes **Improve My Brief**.
- Waits for *"Generating your new brief"* (or equivalent) before settings-complete state.
- Asserts improved text matches **theme/length** heuristics (configurable `intent.themes`, `minThemesMatched`, `minImprovedLength`)—not verbatim manual copy.

**What automation does not cover**

- Subjective quality of AI rewrite; full manual read of every paragraph.

**Artifacts:** `improve-my-brief.spec.data.ts`, `improve-my-brief.spec.ts`

---

### TC-013 — Settings source upload isolation

**Manual intent:** Upload a source file on **New deliverable**, generate, then confirm **sample deliverable** does **not** show that file (isolation).

**What automation covers**

- Upload on **New deliverable**: `ai-market-entry-brief.pdf`.
- **Generate** on New deliverable.
- Opens **sample deliverable** → **Settings** → asserts uploaded filename is **absent**.

**Artifacts:** `deliverable-settings-source.spec.data.ts`, `deliverable-z-settings-source.spec.ts`

---

### TC-014 — Chat Assistant

**Manual intent:** Open Chat Assistant on **New deliverable**, ask a context-aware question, receive a relevant reply without leaking other client content; close and reopen.

**What automation covers**

- Prompt references deliverable brief and **Test Cigno**.
- Asserts response mentions required token (**`cigno`**) and at least one **theme** from configured list.
- **Leak markers** forbidden (e.g. BNP Paribas, Goldman Sachs, other sample client names).
- **Forbidden phrases** (generic “no access” boilerplate) rejected.
- Close/reopen assistant and repeat availability check.

**What automation does not cover**

- Full conversational regression across all prompts; legal/compliance review of AI answers.

**Artifacts:** `chat-assistant.spec.data.ts`, `chat-assistant.spec.ts`

---

### TC-015 — Deliverable export (PPTX vs on-screen)

**Manual intent:** On **New deliverable**, generate from Settings, export as soon as **Export** is enabled, and verify downloaded **PPTX** reflects on-screen deliverable content (manual reference: *Test Cigno Deliverable* export output).

**What automation covers**

1. Open **New deliverable** (**automation** / **New project**).
2. **Settings** → **Generate** (fast path to **Export** enabled).
3. **Capture on-screen snapshot**: title, section headings (workplan tabs + h2), body excerpt from primary section.
4. **Download PPTX**; filename may contain `new_deliverable`.
5. **Content correlation** via `assertExportMatchesDeliverableContent`:
   - Markers present on screen and in file: `cigno`, `market`, `strategy`, `consulting`, `automation`.
   - Section heading overlap (e.g. Executive Summary, Introduction).
   - Body word overlap threshold (~25% of significant words).
   - **Fallback:** valid early-export PPTX artifact (minimum size, `ppt/` structure) if export fires before full storyline text is on screen.

**Known limitations**

- Automation may pass when export is triggered **early** in generation; correlation is **heuristic**, not a byte-for-byte or slide-by-slide manual comparison.
- Does not validate every slide animation, chart, or brand template pixel.

**Typical duration:** ~2–4 minutes with fast generate path.

**Artifacts:** `deliverable-export.spec.data.ts`, `deliverable-export-flow.page.ts`, `deliverable-export-content.utils.ts`

---

### TC-016 — Export loader and duplicate-click guard

**Manual intent:** During export on **New deliverable**, verify loading state, disabled/guarded UI on repeated clicks, single download, and resolution without hang.

**What automation covers**

1. Same **New deliverable** + fast **Generate** → **Export** ready path as TC-015.
2. Starts export download listener.
3. **`triggerExportAndValidateLoaderDuringProcessing`**: loader visible, export control behavior during processing.
4. **Repeated clicks** (default **5**) while processing—asserts no duplicate PPTX downloads.
5. Waits for export to **resolve** within configured timeout; saves download under test output dir.
6. Asserts **exactly one** `.pptx` download event.

**What automation does not cover**

- Network throttling, offline export, or corrupt file recovery.

**Typical duration:** ~1.5–3 minutes.

**Artifacts:** `deliverable-export-loader.spec.data.ts`, `deliverable-export-loader-flow.page.ts`

---

### TC-017 — Edits sync (Brief, Settings, Deliverable)

**Manual intent:** On **sample deliverable**, edit brief/settings, **Reset and Regenerate**, and verify edits **sync and persist** across views (marker: *"New edited text in Test Cigno Deliverable"*).

**What automation covers**

| Step | Automation behavior |
|------|---------------------|
| **Setup** | Open app (session cookies), open **sample deliverable** under **automation** / **New project**; wait Export-ready storyline. |
| **1** | Edit **Brief** (if editable) and **Settings** via `editBriefAndSettings`; assert marker in Settings (and Brief when edited). |
| **2** | **Reset / Regenerate** from Settings; `waitForFullRegenerationComplete` until storyline regen finishes. |
| **3** | Return to **Settings → Brief → Deliverable** via `verifySyncRetainedAcrossViews`; verify sync marker retained (no Sticky notes / **Update section** step). |

**Test data**

- `deliverableName`: `sample deliverable`
- `syncMarker`: `New edited text in Test Cigno Deliverable`

**Known limitations**

- **Brief** may not surface Settings-only marker after regeneration; test documents this and relies on **Deliverable** (+ Settings when readable) as source of truth.
- Settings form visibility on “back” navigation can be flaky; step 4 records attachments instead of hard-failing when Settings is not readable.
- Does not validate every field on every stage—focus is **cross-view sync of the explicit marker**.

**Artifacts:** `deliverable-edits-sync.spec.data.ts`, `deliverable-edits-sync-flow.page.ts`, `deliverable-edits-sync.page.ts`

---

### TC-018 — Deliverable read/update (New deliverable only)

**Manual intent:** Open **New deliverable**, verify details are viewable, update fields on that record only, save, reopen, and confirm persistence without affecting other deliverables.

**What automation covers**

- Sidebar: **automation** / **New project** / **New deliverable** (existing fixture; no dashboard create).
- **Read:** Settings visible (Deliverable Type, Project objectives, Time horizon).
- **Update:** Appends marker **Test Cigno Deliverable updated fields** to **Project objectives**, **Time horizon**, and **Mode consideration** (when visible); saves via blur + API wait (no Sticky notes, no **Generate**).
- **Reopen:** Returns to app home, reopens **New deliverable**, asserts marker persists in Settings.
- **Isolation:** Opens **sample deliverable**; asserts marker is absent.

**Tags:** `@regression @deliverable @read-update @new-deliverable @critical` (included in `test:fast`).

**Run:** `npx playwright test --grep "TC-018" --project=Chromium`

**Artifacts:** `deliverable-read-update.spec.ts`, `deliverable-read-update-flow.page.ts`, `deliverable-read-update.page.ts`

---

## 6. Cross-cutting automation behaviors (deliverable suite)

These shared implementations affect **TC-009–TC-017** interpretation:

| Behavior | Used by | Description |
|----------|---------|-------------|
| `ensureClientNameSelected` | TC-010, TC-015–TC-017 | Fills **automation** client before Generate to avoid “Client Name required” validation |
| `generateFromSettingsAndWaitForExport` | TC-015, TC-016, TC-017 | Polls **Export** enabled instead of full brief progress completion |
| `clickGenerateWithResetIfPrompted` | Multiple | Handles **Reset storyline** and **Reset and Regenerate** modals |
| `openSettingsFromAnyStage` / fast navigation | TC-017, export flows | Reduces brittle stage-to-stage waits |
| Session guard `assertCookiesSessionActive` | All dashboard flows | Fails fast with message to run `test:refresh-session` when cookies expired |
| Viewport | Local runs | Maximized browser; CI uses 1920×1200 |

---

## 7. Reporting and traceability

- **Playwright HTML report:** `playwright-report/`
- **Allure:** `allure-results/` → `npm run allure:generate`
- **Trace / video:** enabled on failure and per `playwright.config.ts` (`trace: 'on'`, `video: 'on'`)
- **Test case ID in title:** Each spec logs `testCase`, `testDescription`, and `tags` via `logTestCaseData` for report filtering (e.g. `--grep TC-015`).

---

## 8. Gaps and follow-ups

| Item | Priority | Notes |
|------|----------|-------|
| **TC-011** | High | No automation; define manual case and implement |
| **TC-018** | — | Implemented (`deliverable-read-update.spec.ts`); requires **New deliverable** + **sample deliverable** fixtures |
| **TC-015 strict export parity** | Medium | Early-export fallback may pass without full on-screen storyline in PPTX |
| **TC-017 Brief sync** | Low | Soft assertion when Brief does not show marker after regen |
| **TC-017 regen duration** | — | Defaults: 30 min regen wait, 35 min test; marker polls +5 min (override via `TC017_*_TIMEOUT_MS` env) |
| **Environment data dependency** | Ongoing | TC-003 (Hassan Ahmad), TC-009 (sample deliverable), New deliverable fixture must exist |
| **Test data cleanup** | Ongoing | TC-002, TC-006, TC-007 create entities; consider factory cleanup or dedicated env |

---


*For framework conventions and alignment with workspace skills, see [FRAMEWORK_ALIGNMENT.md](./FRAMEWORK_ALIGNMENT.md).*
