# Validation Checklist

Use this checklist before returning generated or edited automation code.

- New Page Object file lives in `src/page/login/`.
- Every locator is typed as `LocatorInfo` with a human-readable `description`.
- XPath selectors are preferred.
- CSS is used only when XPath is genuinely not viable or stable attributes exist.
- No auto-generated IDs, hashed classes, or deep positional CSS chains are used.
- All actions use `PlaywrightActionFactory` or `PlaywrightVerificationFactory`.
- No raw Playwright API calls appear in Page Objects unless no factory method exists.
- No hardcoded credentials or URLs are used.
- Environment-specific values come from `process.env` or `getEnvVariable`.
- No test data is imported into Page Objects.
- Data flows from spec into Page Object methods.
- Page Object is registered in `src/fixtures/page.fixtures.ts`.
- Spec imports `test` from `@fixtures/page.fixtures`.
- `logTestCaseData(test.info(), scenario.testCaseData)` is the first line of every test body.
- Production-restricted tests use `test.skip` or `isDemoEnv()` guard.
- Dynamic test data uses `TestDataUtils` or `random.utils`.
- Optional elements use try-catch with a short timeout.
- Required elements are not hidden behind try-catch.
- Locators use `normalize-space()` for text matching when whitespace may vary.
- Test title includes test case ID, description, and tags.
- Data lookup key matches the `testCase` value.
- Tags follow `@regression @smoke @<module>` format.
