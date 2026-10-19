import { test } from '@fixtures/page.fixtures';
import { TC016_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-export-loader.timeouts';
import { getDeliverableExportLoaderTestCaseData } from '@data/dashboard/deliverable/deliverable-export-loader.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDeliverableExportLoaderTestCaseData('001-SampleDeliverableExportLoader');

test.use({ acceptDownloads: true });

test.describe('Feature: Export loader / promise (TC-016)', () => {
  test.describe.configure({ timeout: TC016_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ deliverableExportLoaderFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      await deliverableExportLoaderFlowPage.runExportLoaderWorkflow(bundle);
    },
  );
});
