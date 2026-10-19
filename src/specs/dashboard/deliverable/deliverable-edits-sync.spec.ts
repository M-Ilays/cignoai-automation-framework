import { test } from '@fixtures/page.fixtures';
import { TC017_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-edits-sync.timeouts';
import { getDeliverableEditsSyncTestCaseData } from '@data/dashboard/deliverable/deliverable-edits-sync.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDeliverableEditsSyncTestCaseData('001-NewDeliverableEditsSync');

test.describe('Feature: Edits sync (TC-017)', () => {
  test.describe.configure({ timeout: TC017_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ deliverableEditsSyncFlowPage }) => {
      test.setTimeout(TC017_TEST_TIMEOUT_MS);
      logTestCaseData(test.info(), bundle.testCaseData);

      await deliverableEditsSyncFlowPage.runEditsSyncWorkflow(bundle);
    },
  );
});
