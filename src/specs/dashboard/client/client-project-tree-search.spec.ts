import { faker } from '@faker-js/faker';
import { test } from '@fixtures/page.fixtures';
import { getClientProjectSidebarFlowTestCaseData } from '@data/dashboard/client/client-project-sidebar-flow.spec.data';
import { logTestCaseData } from '@utilities/helpers/test-helper.utils';

const bundle = getClientProjectSidebarFlowTestCaseData('001-ProjectNameTreeSearch');

test.describe('Feature: Create client, add project, verify sidebar hierarchy (TC-007)', () => {
  test.describe.configure({ timeout: 180_000 });

  test(
    `
        Test case: '${bundle.testCaseData.testCase}'
        Description: '${bundle.testCaseData.testDescription}'
        Tags: '${bundle.testCaseData.tags}'
      `,
    async ({ clientProjectSidebarFlowPage }) => {
      logTestCaseData(test.info(), bundle.testCaseData);

      const uniqueClientSuffix = faker.string.alphanumeric(10);
      const uniqueProjectName = `TreeProj ${faker.string.alphanumeric(12)}`;

      await clientProjectSidebarFlowPage.runCreateClientAddProjectAndVerifyHierarchy(
        bundle,
        uniqueClientSuffix,
        uniqueProjectName,
      );
    },
  );
});
