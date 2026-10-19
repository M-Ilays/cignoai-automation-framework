import { test } from '../../../fixtures/page.fixtures';
import { getClientTestCaseData } from '../../../data/dashboard/client/client.spec.data';
import { logTestCaseData } from '../../../utilities/helpers/test-helper.utils';

const scenario = getClientTestCaseData('001-CreateClient');

test.describe('Feature: Client Management', () => {
  test(`${scenario.testCaseData.testCase} - ${scenario.testCaseData.testSummary}`, async ({
    clientPage,
    page,
  }) => {
    logTestCaseData(test.info(), scenario.testCaseData);

    await page.goto(process.env.BASE_URL || '');
    await page.waitForLoadState('load');

    await clientPage.createClient(scenario.clientData);
    await page.waitForTimeout(30000);
  });
});
