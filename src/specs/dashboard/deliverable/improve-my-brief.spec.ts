import { test } from '@fixtures/page.fixtures';
import { TC012_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/improve-my-brief.timeouts';
import { getImproveMyBriefTestCaseData } from '@data/dashboard/deliverable/improve-my-brief.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getImproveMyBriefTestCaseData('001-ImproveMyBrief');

test.describe('Feature: Improve My Brief (TC-012)', () => {
  test.describe.configure({ timeout: TC012_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ improveMyBriefFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      await improveMyBriefFlowPage.runImproveMyBriefWorkflow(bundle);
    },
  );
});
