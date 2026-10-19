# Workflow: Update an Existing Automation Test

Use this workflow when fixing, refactoring, or extending existing automation code.

## Steps

1. Determine which layer needs the change: interface, data, Page Object, fixture, or spec.
2. Prefer the smallest safe change.
3. If a selector is flaky, update the Page Object locator only.
4. If test data changes, update the data file only.
5. If a scenario requires new fields, update the interface and data together.
6. If a new Page Object is introduced, register it in the shared fixture file.
7. If spec logic is growing, move logic into Page Object methods.
8. Validate against `references/validation-checklist.md`.

## Refactoring rules

- Keep specs thin.
- Keep Page Objects free of test data imports.
- Keep locator descriptions human-readable because they appear in Allure logs.
- Preserve existing naming conventions.
- Avoid broad rewrites unless the user explicitly asks for one.
