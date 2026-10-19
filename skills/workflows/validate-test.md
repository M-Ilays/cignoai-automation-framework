# Workflow: Validate Generated or Updated Test Code

Use this workflow before returning automation code.

## Validation order

1. Check imports.
2. Check aliases.
3. Check layer placement.
4. Check data lookup keys.
5. Check Page Object constructor pattern.
6. Check `LocatorInfo` usage.
7. Check factory method usage.
8. Check fixture registration.
9. Check spec thinness.
10. Check production and environment guards.
11. Check dynamic data usage.
12. Check final naming conventions.

## Common issues to catch

- Importing `test` from `@playwright/test` in specs instead of `@fixtures/page.fixtures`.
- Passing bare `Locator` to action or verification factories.
- Adding locators to specs.
- Adding assertions to specs.
- Using deep relative imports.
- Forgetting to register the Page Object fixture.
- Hardcoding credentials, URLs, IMEIs, phone numbers, or emails.
- Using try-catch for required elements.
- Using unstable CSS selectors.
