import { test } from '@fixtures/page.fixtures';
import { TC015_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-export.timeouts';
import { getDeliverableExportTestCaseData } from '@data/dashboard/deliverable/deliverable-export.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDeliverableExportTestCaseData('001-NewDeliverableExport');

test.use({ acceptDownloads: true });

test.describe('Feature: Deliverable Export (TC-015)', () => {
  test.describe.configure({ timeout: TC015_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ deliverableExportFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      await deliverableExportFlowPage.runDeliverableExportWorkflow(bundle);
    },
  );
});
