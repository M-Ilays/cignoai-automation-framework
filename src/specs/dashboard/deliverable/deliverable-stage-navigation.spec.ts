import { test } from '@fixtures/page.fixtures';
import { TC009_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-stage-navigation.timeouts';
import { getDeliverableStageNavigationTestCaseData } from '@data/dashboard/deliverable/deliverable-stage-navigation.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDeliverableStageNavigationTestCaseData('001-SampleDeliverableStages');

test.describe('Feature: Deliverable stage navigation and performance (TC-009)', () => {
  test.describe.configure({ timeout: TC009_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ deliverableStageNavigationFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      await deliverableStageNavigationFlowPage.runValidateStageNavigationAndPerformance(bundle);
    },
  );
});
