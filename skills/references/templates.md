# Code Templates

Use these templates when generating framework files.

## Interface template

```typescript
export interface MyFeatureDetails {
  mainURL: string;
}
```

## Data template

```typescript
import { MyFeatureDetails } from '@interfaces/myFeature.interface';
import { TestCaseData } from '@interfaces/testcase.data.interface';
import { LoginDetails } from '@interfaces/login.interface';

export interface MyFeatureTestCaseData {
  testCaseData: TestCaseData;
  loginDetails: LoginDetails;
  myFeatureDetails: MyFeatureDetails;
}

const myFeatureTestData: { [key: string]: MyFeatureTestCaseData } = {
  'AQ-99-My-Feature': {
    myFeatureDetails: { mainURL: process.env.AUTH_URL || '' },
    loginDetails: {
      username: process.env.user_name || '',
      password: process.env.password || '',
    },
    testCaseData: {
      tags: '@regression @smoke',
      testCase: 'AQ-99-My-Feature',
      testDescription: 'One-line description of what is being validated.',
      testSummary: 'Short summary of the acceptance criterion.',
    },
  },
};

export function getMyFeatureData(testCase: string): MyFeatureTestCaseData {
  const data = myFeatureTestData[testCase];
  if (!data) {
    throw new Error(`Test case data not found for: ${testCase}`);
  }
  return data;
}
```

## Page Object template

```typescript
import { Page, TestInfo, test } from '@playwright/test';
import { PlaywrightActionFactory } from '@utilities/playwright.actions.utils';
import { PlaywrightVerificationFactory } from '@utilities/playwright.verifications.utils';
import { LocatorInfo } from '@interfaces/locator.info.interface';

export class MyFeaturePage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly playwrightActionsFactory: PlaywrightActionFactory;
  private readonly playwrightVerificationsFactory: PlaywrightVerificationFactory;
  private readonly locators: { [key: string]: LocatorInfo };

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.playwrightActionsFactory = new PlaywrightActionFactory(page, testInfo);
    this.playwrightVerificationsFactory = new PlaywrightVerificationFactory(page, testInfo);

    this.locators = {
      someButton: {
        description: 'Some Button',
        locator: this.page.locator("//button[normalize-space()='Some Button']"),
      },
      someHeader: {
        description: 'Some Header',
        locator: this.page.locator("//h1[normalize-space()='Welcome']"),
      },
    };
  }

  public async doSomething(): Promise<void> {
    await test.step('Description of the high-level action', async () => {
      await this.playwrightActionsFactory.click(this.locators.someButton);
      await this.playwrightVerificationsFactory.expectElementExist(this.locators.someHeader);
    });
  }
}
```

## Fixture registration template

```typescript
import { MyFeaturePage } from '@page/login/myFeature.page';

type TestFixtures = {
  myFeaturePage: MyFeaturePage;
};

export const test = base.extend<TestFixtures>({
  myFeaturePage: async ({ page }, use) => {
    const myFeaturePage = new MyFeaturePage(page, base.info());
    await use(myFeaturePage);
  },
});
```

## Spec template

```typescript
import { logTestCaseData } from '@utilities/test.helper.utils';
import { getMyFeatureData } from '@data/login/myFeature.data';
import { test } from '@fixtures/page.fixtures';

const scenario1 = getMyFeatureData('AQ-99-My-Feature');

test.describe('Feature: <Short feature description>', () => {
  test(`
        Test case: '${scenario1.testCaseData.testCase}'
        Description: '${scenario1.testCaseData.testDescription}'
        Tags: '${scenario1.testCaseData.tags}'
      `, async ({ loginPage, myFeaturePage }) => {
    logTestCaseData(test.info(), scenario1.testCaseData);

    await test.step('Admin user logs into the website', async () => {
      await loginPage.navigateToLoginPage();
      await loginPage.loginPage(scenario1.loginDetails);
    });

    await test.step('Step description here', async () => {
      await myFeaturePage.doSomething();
    });
  });
});
```
