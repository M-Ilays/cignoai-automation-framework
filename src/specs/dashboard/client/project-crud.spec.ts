import { faker } from '@faker-js/faker';
import { test } from '@fixtures/page.fixtures';
import { getProjectCrudTestCaseData } from '@data/dashboard/client/project-crud.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getProjectCrudTestCaseData('001-ProjectCrudLifecycle');

test.describe('Feature: Project CRUD (TC-020)', () => {
  test.describe.configure({ timeout: 240_000 });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ projectCrudFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      const suffix = faker.string.alphanumeric(10);
      const initialName = `${bundle.scenario.initialProjectNameBase} ${suffix}`;
      const updatedName = `${bundle.scenario.updatedProjectNameBase} ${suffix}`;

      await projectCrudFlowPage.runProjectCrudWorkflow(bundle, initialName, updatedName);
    },
  );
});
