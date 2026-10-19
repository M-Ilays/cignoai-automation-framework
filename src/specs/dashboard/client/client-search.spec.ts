import { expect } from '@playwright/test';
import { test } from '../../../fixtures/page.fixtures';
import {
  getClientSearchNegativeTestCaseData,
  getClientSearchTestCaseData,
} from '../../../data/dashboard/client/client-search.spec.data';
import { logTestCaseData } from '../../../utilities/helpers/test-helper.utils';

const positiveScenario = getClientSearchTestCaseData('001-SearchClient');
const negativeScenario = getClientSearchNegativeTestCaseData('002-SearchNonExistentClient');

test.describe('Feature: Client Search', () => {
  test(`${positiveScenario.testCaseData.testCase} - ${positiveScenario.testCaseData.testSummary}`, async ({
    page,
    clientSearchPage,
  }) => {
    logTestCaseData(test.info(), positiveScenario.testCaseData);

    await page.goto(process.env.BASE_URL || '');
    await page.waitForLoadState('load');

    await clientSearchPage.searchAndOpenClientDetails(positiveScenario.scenario);

    await expect(
      page.getByText(new RegExp(positiveScenario.scenario.clientLabelToSelect, 'i')).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test(`${negativeScenario.testCaseData.testCase} - ${negativeScenario.testCaseData.testSummary}`, async ({
    page,
    clientSearchPage,
  }) => {
    logTestCaseData(test.info(), negativeScenario.testCaseData);

    await page.goto(process.env.BASE_URL || '');
    await page.waitForLoadState('load');

    const ghost = negativeScenario.scenario.nonExistentClientName;

    await clientSearchPage.searchClients(ghost);

    await expect(clientSearchPage.sidebarExactClientMatch(ghost)).toHaveCount(0);

    await page.waitForTimeout(5000);

    await clientSearchPage.clearClientSearch();

    await expect(clientSearchPage.searchClientsInput()).toHaveValue('');
  });
});
