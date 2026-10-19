# Workflow: Add a Test Case to an Existing Feature

Use this workflow when adding a new scenario to an existing spec and Page Object.

## Steps

1. Open `src/data/login/<featureName>.data.ts`.
2. Add a new test data entry with a unique Jira-style key.
3. Ensure the data key matches the `testCase` field value.
4. Open `src/specs/login/<featureName>.spec.ts`.
5. Retrieve the new data with `getXxxData('AQ-NEW-ID')`.
6. Add a new `test(...)` block using the existing template style.
7. If the scenario needs new interactions, add locators and public methods to the existing Page Object.
8. If the scenario needs new data fields, extend the feature interface.
9. Validate against `references/validation-checklist.md`.

## Rules

- Do not duplicate existing Page Object methods unnecessarily.
- Do not put new locators or assertions in the spec.
- Do not create a new Page Object if the scenario belongs to an existing feature area.
- Keep the spec thin.
