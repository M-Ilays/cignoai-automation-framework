# Framework alignment (Cigno FE QA vs workspace skills reference)

This document records how the repository aligns with the standards in `skills/` (FreedomPop-style Playwright reference), what was refactored in this pass, and recommended follow-ups.

## Reference materials (workspace)

| Path | Role |
|------|------|
| `skills/SKILL.md` | Routing: strict TS, POM, five-layer features, thin specs, factories, aliases |
| `skills/references/core-framework.md` | Layers, naming, fixtures, path aliases |
| `skills/references/locator-rules.md` | `LocatorInfo` shape, XPath preference, optional-element try/catch |
| `skills/references/utility-factories.md` | Action / verification factory surface |
| `skills/references/environment-and-data.md` | Env vars, dynamic data, prod guards |
| `skills/references/templates.md` | Copy templates for interface, data, page, fixture, spec |
| `skills/references/validation-checklist.md` | Pre-merge compliance checks |
| `skills/workflows/*.md` | Generate, add case, update, validate, audit workflows |
| `skills/agents/playwright-agent.md` | Agent style: small changes, repo pattern over blind copy |

## Architectural decisions (this pass)

1. **Central `LocatorInfo` type**  
   The reference uses the name `LocatorInfo`; this repo historically used `LocatorDetails`. Both names now resolve to the same type via `export type LocatorInfo = LocatorDetails` in `src/interface/base/locator.interface.ts`. `PlaywrightActionsFactory`, `PlaywrightVerificationsFactory`, and `CommonFunctionsFactory` import that type instead of duplicating a private interface.

2. **Path aliases**  
   `tsconfig.json` already had `@page`, `@fixtures`, `@utilities`, `@data`, `@interface`. Added **`@interfaces/*`** → `src/interface/*` so imports can match plural naming from the skill without renaming the physical `interface/` folder (avoids a large breaking rename).

3. **Nested scroll utilities (separation of concerns)**  
   Radix/nested scroll logic that relied on `page.evaluate` does not map cleanly to factory methods. It is extracted to `src/utilities/playwright/nested-scroll.utils.ts` with documented exports (`NESTED_SCROLLABLE_SELECTOR`, `flushNestedScrollContainersToBottom`, `warmScrollClientDetailTowardBottom`). `ProjectPage` orchestrates and keeps locators; low-level DOM scrolling lives in utilities. This matches the spirit of “no raw Playwright in Page Objects unless necessary,” while acknowledging that scroll snapping is a justified exception, isolated and testable.

4. **Factory usage in `ProjectPage`**  
   Post–“add project” navigation now waits via `this.actions.waitForVisibility(this.locators.projectCreationEntry, …)` instead of a raw `page.getByText(…).waitFor`, improving Allure step consistency.

5. **Spec structure (`create-client-and-project.spec.ts`)**  
   Imports switched to aliases (`@fixtures`, `@data`, `@utilities`, `@page`). Test title follows the multi-line pattern from `skills/references/templates.md` (case id, description, tags). Body grouped into named `test.step` blocks for reporting clarity. `logTestCaseData` remains first in the test body per checklist.

6. **`GeneralUtils` cleanup**  
   The previous file mixed broken static/instance code and unused constructor state. It is reduced to **static data helpers only** (faker/date-fns), which matches actual usage (`new GeneralUtils` did not appear in `src/`). Any future UI interaction belongs on a Page Object with `PlaywrightActionsFactory`.

## Repo vs reference: intentional differences

| Topic | Reference skill | This repo |
|--------|------------------|-----------|
| Folder `interfaces/` vs `interface/` | Plural | Singular folder kept; `@interfaces` alias added |
| `PlaywrightActionFactory` naming | Singular | Existing `PlaywrightActionsFactory` kept (rename would be wide churn) |
| TypeScript `strict` | `true` in skill text | `strict: false` in `tsconfig.json` today; enabling strict is a phased migration |
| Layer paths | `src/data/login/...` | Domain split `src/data/dashboard/...` (valid modular evolution) |
| Locator strategy | XPath-first | Product uses roles, testids, and stable CSS where appropriate; migrate hotspots gradually |

## Enhancements beyond a literal copy of the reference

- **Scroll utility module** with explicit options type (`WarmScrollOptions`) and reusable flush logic for nested layouts.
- **Dual naming** (`LocatorDetails` + `LocatorInfo`) for backward compatibility and skill alignment.
- **Stricter typing** on factory imports (single source of truth for locator shape).
- **Spec title + steps** aligned to templates without forcing a single `login/` data path.

## Recommended follow-ups (prioritized)

1. Migrate remaining specs and page objects from deep relatives to `@page`, `@interface`, `@utilities`, `@data` imports (eslint rule or codemod).
2. Turn `compilerOptions.strict` on incrementally; fix surfaced issues per package.
3. Gradually replace fragile locators with XPath + `normalize-space()` where the skill calls for it, keeping `getByRole` / `getByTestId` where they are objectively more stable.
4. Add `getEnvVariable` helper (as in skill) and route `BASE_URL` reads through it for consistency.
5. Optional: rename directory `src/interface` → `src/interfaces` in a dedicated PR with path + import updates.
6. Extend `page.fixtures.ts` pattern from skill (single merged export already exists via `leader-page.fixtures`); document fixture merge order in this file.

## Anti-patterns addressed

- **Duplicate `LocatorInfo` interfaces** inside multiple utility files (drift risk).
- **Large blocks of `page.evaluate` scroll logic inside a Page Object** (hard to reuse and test).
- **Thin spec missing structured steps** for the flagship client/project flow.

## Files touched (summary)

- `src/interface/base/locator.interface.ts` — `LocatorInfo` alias  
- `src/utilities/playwright/nested-scroll.utils.ts` — **new**  
- `src/page/dashboard/project/project.page.ts` — scroll utilities, `projectCreationEntry`, `prepareProjectsPanelForAddProject`, `runFirstProjectViaAiDescriptionPath`  
- `src/page/dashboard/client/client.page.ts` — path aliases, `runCreateClientThenOpenDetailForProjects`  
- `src/fixtures/leader-page.fixtures.ts` — `clientProjectFlowPage` fixture  
- `src/utilities/playwright/playwright-actions.utils.ts` — shared `LocatorInfo` import  
- `src/utilities/playwright/playwright-verifications.utils.ts` — shared `LocatorInfo` import  
- `src/utilities/helpers/common-functions.utils.ts` — shared `LocatorInfo` + alias imports  
- `src/utilities/playwright/general.utils.ts` — simplified static helpers only  
- `tsconfig.json` — `@interfaces/*` path  
- `docs/FRAMEWORK_ALIGNMENT.md` — **this document**

## Flow orchestration (`ClientProjectFlowPage`)

Full E2E journeys that span multiple feature pages are implemented as **one public method per journey**, with **Playwright `test.step`** boundaries at business-meaningful points (not one step per click).

- `runCreateClientAndFirstAiProject(testCase: ClientProjectFlowTestCaseData)` — uses `testCase.scenario` for automation and `testCase.testCaseData` in step labels / future hooks.
- `ClientPage.runCreateClientThenOpenDetailForProjects(client)` — client-only composed slice (create + open detail + Projects heading).
- `ProjectPage.prepareProjectsPanelForAddProject()` — expand Projects + scroll to add-project CTA.
- `ProjectPage.runFirstProjectViaAiDescriptionPath(project)` — wizard from first-project entry through Create Project.

Specs for those flows should call the flow fixture (`clientProjectFlowPage`) and stay thin: `logTestCaseData` + one `run…` call.

When extending the framework, load the smallest set of files from `skills/` for the task (per `SKILL.md`) and update this document if architecture conventions change materially.
