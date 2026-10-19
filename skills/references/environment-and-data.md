# Environment and Data Rules

## Environment variables

Never hardcode credentials, URLs, phone numbers, IMEIs, or environment-specific values.

Use `process.env` in data files for scenario data.

Use `getEnvVariable` from `@utilities/env.utils` in Page Object constructors when locators depend on runtime env values.

## Dynamic test data

Use built-in utilities for runtime data. Do not hardcode values that should be unique per run.

### TestDataUtils

Import from:

```typescript
import { TestDataUtils } from '@utilities/testData.generate.utils';
```

Available methods:

```typescript
const name = TestDataUtils.generateRandomName();
const city = TestDataUtils.generateRandomCity();
const zip = TestDataUtils.generateRandomZip();
const state = TestDataUtils.generateRandomState();
const address = TestDataUtils.generateRandomAddress();
```

### random.utils

Import from:

```typescript
import {
  generateRandomNumber,
  generateRandomAlphanumeric,
  generateRandomEmailAddress,
} from '@utilities/random.utils';
```

Available methods:

```typescript
const phone = generateRandomNumber(10);
const token = generateRandomAlphanumeric(8);
const email = generateRandomEmailAddress();
```

Use dynamic data in the data file when the scenario requires unique-per-run values. Do not generate test data in Page Objects.

## Production skipping

Tests involving real payments or environment-sensitive flows must be conditionally skipped or partially skipped in production.

### Skip an entire test

```typescript
test.skip(process.env.NODE_ENV === 'prod', 'Skipped in production due to live payment restrictions');
```

### Skip a step inside a test with Allure annotation

```typescript
import { isDemoEnv } from '@utilities/env.utils';
import * as allure from 'allure-js-commons';

if (!isDemoEnv()) {
  await allure.parameter('environment', 'prod');
  await allure.parameter('condition', 'demo-only');
  await allure.parameter('info', 'Payment step skipped (PROD)');
  return;
}
```

## Running tests

```bash
npm run test:demo
npm run test:dev
npm run test:prod
npx playwright test src/specs/login/myFeature.spec.ts
npx playwright test --grep="AQ-99"
npx playwright test --grep="@smoke"
npx playwright test --headed
npx playwright test --timeout=180000
npm run allure:generate
npm run allure:open
```
