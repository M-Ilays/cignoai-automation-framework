import type { ClientProjectFlowTestCaseData } from '@interface/dashboard/client-project-flow.interface';

/**
 * Reuses {@link ClientProjectFlowTestCaseData}: specs append unique suffixes to the client name
 * and a unique project name at runtime; {@link ClientProjectFlowProjectInput.projectName} in data is ignored.
 */
const clientProjectSidebarFlowTestData: { [key: string]: ClientProjectFlowTestCaseData } = {
  '001-ProjectNameTreeSearch': {
    scenario: {
      client: {
        name: 'QA Tree Client',
        website: 'https://www.daraz.pk/#?',
        industry: 'Technology',
      },
      project: {
        aiProjectDescription: 'Automated test project for sidebar hierarchy validation',
        projectName: 'Placeholder',
        startDateDdMmYyyy: '14/05/2026',
        endDateDdMmYyyy: '16/05/2026',
        endDateOffsetDays: 2,
      },
    },
    testCaseData: {
      tags: '@regression @client @project @tree',
      testCase: 'TC-007',
      testDescription:
        'Create client, add first project (AI path), submit review; go home, search by project name, verify project nested under client in tree',
      testSummary: 'Client, first project, sidebar hierarchy',
    },
  },
};

export function getClientProjectSidebarFlowTestCaseData(testCase: string): ClientProjectFlowTestCaseData {
  const row = clientProjectSidebarFlowTestData[testCase];
  if (!row) {
    throw new Error(`Client project sidebar flow test data not found for: ${testCase}`);
  }
  return row;
}
