# Workflow: Generate a New Test Feature

Use this workflow when creating a brand-new automated test feature.

## Required output

Create or modify exactly the framework layers needed for the feature:

1. `src/interfaces/<featureName>.interface.ts`
2. `src/data/login/<featureName>.data.ts`
3. `src/page/login/<featureName>.page.ts`
4. `src/fixtures/page.fixtures.ts`
5. `src/specs/login/<featureName>.spec.ts`

## Steps

1. Identify the feature name in camelCase.
2. Identify the Jira-style test case ID.
3. Define the page-specific interface fields.
4. Create the data object keyed by the test case ID.
5. Create the Page Object with constructor, factories, and typed locators.
6. Add public Page Object methods for each high-level user action or verification.
7. Register the Page Object in `src/fixtures/page.fixtures.ts`.
8. Create a thin spec that logs test metadata and delegates to Page Object methods.
9. Validate against `references/validation-checklist.md`.

## Required references

Read these before generating code:

- `references/core-framework.md`
- `references/locator-rules.md`
- `references/templates.md`
- `references/environment-and-data.md`
- `references/validation-checklist.md`

Read `references/utility-factories.md` when choosing action or verification methods.

## Rules

- Do not place locators in the spec.
- Do not place assertions in the spec.
- Do not import data into Page Objects.
- Do not create new fixture files.
- Do not use relative imports across layer boundaries.
- Do not hardcode credentials or URLs.
- Use a descriptive `test.step` for every logical action group.
