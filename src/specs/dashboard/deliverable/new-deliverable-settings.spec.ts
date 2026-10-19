import { test } from '@fixtures/page.fixtures';
import { TC010_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-new-settings.timeouts';
import { getDeliverableNewSettingsTestCaseData } from '@data/dashboard/deliverable/deliverable-new-settings.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDeliverableNewSettingsTestCaseData('001-NewDeliverableSettings');

test.describe('Feature: New deliverable settings form (TC-010)', () => {
  test.describe.configure({ timeout: TC010_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ newDeliverableSettingsFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      await newDeliverableSettingsFlowPage.runNewDeliverableSettingsWorkflow(bundle);
    },
  );
});
