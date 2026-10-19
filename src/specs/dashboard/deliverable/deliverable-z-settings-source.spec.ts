import { test } from '@fixtures/page.fixtures';
import { TC013_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-settings-source.timeouts';
import { getDeliverableSettingsSourceTestCaseData } from '@data/dashboard/deliverable/deliverable-settings-source.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDeliverableSettingsSourceTestCaseData('001-SettingsSourceUpload');

test.describe('Feature: Settings source upload (TC-013)', () => {
  test.describe.configure({ timeout: TC013_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ deliverableSettingsSourceFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      await deliverableSettingsSourceFlowPage.runSettingsSourceUploadWorkflow(bundle);
    },
  );
});
