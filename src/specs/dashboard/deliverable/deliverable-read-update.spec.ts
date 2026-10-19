import { test } from '@fixtures/page.fixtures';
import { TC018_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-read-update.timeouts';
import { getDeliverableReadUpdateTestCaseData } from '@data/dashboard/deliverable/deliverable-read-update.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDeliverableReadUpdateTestCaseData('001-NewDeliverableReadUpdate');

test.describe('Feature: Deliverable read/update — New deliverable only (TC-018)', () => {
  test.describe.configure({ timeout: TC018_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ deliverableReadUpdateFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      const uniqueMarker = `${bundle.scenario.updateMarker.trim()} [run-${Date.now()}]`;
      await deliverableReadUpdateFlowPage.runReadUpdateWorkflow(bundle, uniqueMarker);
    },
  );
});
