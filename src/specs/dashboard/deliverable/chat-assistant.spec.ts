import { test } from '@fixtures/page.fixtures';
import { TC014_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/chat-assistant.timeouts';
import { getChatAssistantTestCaseData } from '@data/dashboard/deliverable/chat-assistant.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getChatAssistantTestCaseData('001-NewDeliverableChat');

test.describe('Feature: Chat Assistant (TC-014)', () => {
  test.describe.configure({ timeout: TC014_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ chatAssistantFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      await chatAssistantFlowPage.runChatAssistantWorkflow(bundle);
    },
  );
});
