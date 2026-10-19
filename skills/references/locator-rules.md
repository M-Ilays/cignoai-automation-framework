# Locator Rules

## LocatorInfo rule

Every locator must be typed as `LocatorInfo`.

A locator must be an object with:

```typescript
{
  description: string;
  locator: Locator;
}
```

Never pass a bare `Locator` to `PlaywrightActionFactory` or `PlaywrightVerificationFactory`.

## Preferred selector strategy

Prefer XPath with semantic text matching.

Good examples:

```typescript
page.locator("//button[normalize-space()='Next']")
page.locator("//div[text()='Plan Details']/following-sibling::div//button")
page.locator(`//span[text()='${dynamicValue}']`)
page.locator('[data-testid="submit"]')
page.locator('button[aria-label="Create"]')
page.locator('svg.lucide-chevron-down').nth(2)
```

Use CSS only when XPath is genuinely not viable or when a stable attribute exists.

Bad examples:

```typescript
page.locator('#auto-generated-123')
page.locator('.css-random-hash')
page.locator('div > div > div > button')
```

Avoid:

- Auto-generated IDs.
- Hashed class names.
- Deep positional CSS chains.
- Layout-dependent selectors.

## Text matching

Use `normalize-space()` in XPath whenever button or label text may have surrounding whitespace.

Preferred:

```typescript
this.page.locator("//button[normalize-space()='Continue']")
```

Avoid:

```typescript
this.page.locator("//button[text()=' Continue ']")
```

## Dynamic environment values in locators

If a locator XPath depends on a runtime value from `.env`, read the value in the constructor using `getEnvVariable` from `@utilities/env.utils`.

```typescript
import { getEnvVariable } from '@utilities/env.utils';

const imei = getEnvVariable('DEVICE_IMEI');
this.locators.imeiLabel = {
  description: 'IMEI Label',
  locator: this.page.locator(`//span[text()='${imei}']`),
};
```

## Optional elements

Use try-catch only for elements that may or may not appear, such as a banner or conditional modal.

```typescript
try {
  await this.locators.dismissBanner.locator.waitFor({ state: 'visible', timeout: 3000 });
  await this.playwrightActionsFactory.click(this.locators.dismissBanner);
} catch {
  // Banner not present, continue
}
```

Do not use try-catch for elements that must be present. Required elements should fail the test if missing.
