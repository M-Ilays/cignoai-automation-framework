import { test } from '@fixtures/page.fixtures';
import { TC008_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-flow.timeouts';
import { getDashboardDeliverableFlowTestCaseData } from '@data/dashboard/deliverable/dashboard-deliverable-flow.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDashboardDeliverableFlowTestCaseData('001-DashboardDeliverable');

test.describe('Feature: Create deliverable from dashboard (TC-008)', () => {
  test.describe.configure({ timeout: TC008_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ dashboardDeliverableFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      await dashboardDeliverableFlowPage.runCreateDeliverableFromDashboard(bundle);
    },
  );
});
