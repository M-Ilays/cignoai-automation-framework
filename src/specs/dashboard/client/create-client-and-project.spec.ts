import { test } from '@fixtures/page.fixtures';
import { getClientProjectFlowTestCaseData } from '@data/dashboard/client/client-project-flow.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getClientProjectFlowTestCaseData('001-ClientAndProject');

test.describe('Feature: Client and first project', () => {
  test.describe.configure({ timeout: 180_000 });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ clientProjectFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);
      await clientProjectFlowPage.runCreateClientAndFirstAiProject(bundle);
    },
  );
});
