import { expect } from '@playwright/test';
import { test } from '../../../fixtures/page.fixtures';
import { getClientEmptyFormTestCaseData } from '../../../data/dashboard/client/client-empty-form.spec.data';
import { logTestCaseData } from '../../../utilities/helpers/test-helper.utils';

const scenario = getClientEmptyFormTestCaseData('001-EmptyNewClientForm');

test.describe('Feature: New Client Form — Empty', () => {
  test(`${scenario.testCaseData.testCase} - ${scenario.testCaseData.testSummary}`, async ({
    page,
    clientPage,
  }) => {
    logTestCaseData(test.info(), scenario.testCaseData);

    await page.goto(process.env.BASE_URL || '');
    await page.waitForLoadState('load');

    await clientPage.clickAddClient();
    await clientPage.touchEmptyClientFields();

    await expect(clientPage.newClientFormSaveButton()).toBeDisabled();
    await page.waitForTimeout(2000);
    await clientPage.clickCancelNewClientForm();
    await page.waitForTimeout(2000);
  });
});
