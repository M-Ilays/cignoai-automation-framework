import type { ProjectCrudTestCaseData } from '@interface/dashboard/project-crud.interface';

const projectCrudTestData: { [key: string]: ProjectCrudTestCaseData } = {
  '001-ProjectCrudLifecycle': {
    scenario: {
      existingClientLabel: 'automation',
      project: {
        aiProjectDescription: 'Creating Project for TC-020 CRUD validation',
        projectName: 'Test Cigno',
        startDateDdMmYyyy: '19/05/2026',
        endDateDdMmYyyy: '21/05/2026',
        endDateOffsetDays: 2,
      },
      initialProjectNameBase: 'Test Cigno',
      updatedProjectNameBase: 'Testing Cigno Auto',
      isolationReference: {
        clientLabel: 'automation',
        projectLabel: 'New project',
      },
    },
    testCaseData: {
      tags: '@regression @client @project @crud',
      testCase: 'TC-020',
      testDescription:
        'Under existing client automation: create project, verify in tree, rename, verify update, delete project, verify cleanup without impacting New project',
      testSummary: 'Project CRUD lifecycle on existing client (create, read, update, delete)',
    },
  },
};

export function getProjectCrudTestCaseData(testCase: string): ProjectCrudTestCaseData {
  const row = projectCrudTestData[testCase];
  if (!row) {
    throw new Error(`Project CRUD test data not found for: ${testCase}`);
  }
  return row;
}
