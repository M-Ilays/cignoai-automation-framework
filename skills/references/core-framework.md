# Core Framework Reference

## Framework overview

| Concern | Technology |
|---|---|
| Test runner | Playwright Test (`@playwright/test`) |
| Language | TypeScript strict mode, CommonJS output |
| Architecture | Page Object Model |
| Reporting | Allure, Playwright HTML, JUnit XML |
| Environments | `dev`, `prod`, `ci`, `demo`, selected via `ENV_TYPE` |
| Browser | Chromium only, 1920x1080, headed locally, headless on CI |

## Path aliases

Always use these aliases in imports. Never use relative `../../` paths across layer boundaries.

| Alias | Resolves to |
|---|---|
| `@page/*` | `src/page/*` |
| `@fixtures/*` | `src/fixtures/*` |
| `@utilities/*` | `src/utilities/*` |
| `@data/*` | `src/data/*` |
| `@interfaces/*` | `src/interfaces/*` |
| `@enums/*` | `src/enums/*` |

## Project layer map

Every new test feature requires exactly five files or updates, one per layer.

```text
src/
├── interfaces/<featureName>.interface.ts
├── data/login/<featureName>.data.ts
├── page/login/<featureName>.page.ts
├── fixtures/page.fixtures.ts
└── specs/login/<featureName>.spec.ts
```

The fixture file is shared. Do not create a per-feature fixture file.

Login-related tests live under the `login/` sub-directory.

## Layer responsibilities

### Interface layer

Location:

```text
src/interfaces/<featureName>.interface.ts
```

Purpose:

- Define the shape of page-specific data passed into the Page Object.
- Keep the interface minimal.
- Include only fields the page actually consumes.

### Data layer

Location:

```text
src/data/login/<featureName>.data.ts
```

Purpose:

- Store test datasets keyed by Jira-style test case ID.
- Include `testCaseData`.
- Include `loginDetails` when login is required.
- Include the page-specific interface block.

Rules:

- Always read credentials from `process.env`.
- Never hardcode credentials.
- The lookup key must match the `testCase` field.
- The lookup key must match the key used in the spec.
- Tags use the format `@regression @smoke @<module>`.

### Page Object layer

Location:

```text
src/page/login/<featureName>.page.ts
```

Purpose:

- Own all locators.
- Own all interaction methods for a single feature area.
- Use factory methods for actions and verifications.
- Never import test data.
- Accept data through public method parameters.

### Fixture layer

Location:

```text
src/fixtures/page.fixtures.ts
```

Purpose:

- Register every new Page Object class.
- Add import.
- Add `TestFixtures` property.
- Add fixture factory in `test.extend`.

### Spec layer

Location:

```text
src/specs/login/<featureName>.spec.ts
```

Purpose:

- Thin orchestration only.
- Retrieve data.
- Log metadata.
- Delegate actions to Page Objects.
- No locators.
- No raw assertions.

Rules:

- Import `test` from `@fixtures/page.fixtures`, not from `@playwright/test`.
- Call `logTestCaseData(test.info(), scenario.testCaseData)` as the first line of every test body.
- Wrap each logical group of actions in a named `test.step`.
- Test title must include `testCase`, `testDescription`, and `tags`.

## Naming conventions

| Type | Convention | Example |
|---|---|---|
| Page file | `featureName.page.ts` | `upgradePlan&IMEIFlow.page.ts` |
| Spec file | `featureName.spec.ts` | `upgradePlan&IMEIFlow.spec.ts` |
| Data file | `featureName.data.ts` | `upgradePlan&IMEIFlow.data.ts` |
| Interface file | `featureName.interface.ts` | `upgradePlan&IMEIFlow.interface.ts` |
| Page class | PascalCase + Page | `UpgradePlanIMEIFlowPage` |
| Locator key | camelCase | `upgradePlanButton` |
| Page method | verbNoun | `planUpgradeEssentialsToPlus()` |
| Test tag | `@camelCase` | `@regression @smoke @login` |
| Jira test key | `AQ-{number}-Kebab-Description` | `AQ-91-Upgrade-Plan-IMEI-Flow` |
