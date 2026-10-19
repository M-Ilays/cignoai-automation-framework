import { faker } from '@faker-js/faker';
import { test } from '@fixtures/page.fixtures';
import { TC019_TEST_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-crud.timeouts';
import { getDeliverableCrudTestCaseData } from '@data/dashboard/deliverable/deliverable-crud.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getDeliverableCrudTestCaseData('001-DeliverableCrudLifecycle');

test.describe('Feature: Deliverable CRUD (TC-019)', () => {
  test.describe.configure({ timeout: TC019_TEST_TIMEOUT_MS });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ deliverableCrudFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      const suffix = faker.string.alphanumeric(10);
      const initialName = `${bundle.scenario.initialDeliverableNameBase} ${suffix}`;
      const updatedName = `${bundle.scenario.updatedDeliverableNameBase} ${suffix}`;

      await deliverableCrudFlowPage.runDeliverableCrudWorkflow(bundle, initialName, updatedName);
    },
  );
});
