import { faker } from '@faker-js/faker';
import { test } from '@fixtures/page.fixtures';
import { getClientCrudTestCaseData } from '@data/dashboard/client/client-crud.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getClientCrudTestCaseData('001-ClientCrudLifecycle');

test.describe('Feature: Client CRUD (TC-021)', () => {
  test.describe.configure({ timeout: 180_000 });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ clientCrudFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      const suffix = faker.string.alphanumeric(10);
      const initialName = `${bundle.scenario.initialClientNameBase} ${suffix}`;
      const updatedName = `${bundle.scenario.updatedClientNameBase} ${suffix}`;

      await clientCrudFlowPage.runClientCrudWorkflow(bundle, initialName, updatedName);
    },
  );
});
