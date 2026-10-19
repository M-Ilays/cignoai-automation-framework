import type { ClientProjectFlowTestCaseData } from '@interface/dashboard/client-project-flow.interface';

const clientProjectFlowTestData: { [key: string]: ClientProjectFlowTestCaseData } = {
  '001-ClientAndProject': {
    scenario: {
      client: {
        name: 'QA Automation Test Cigno',
        website: 'https://www.daraz.pk/#?',
        industry: 'Technology',
      },
      project: {
        aiProjectDescription: 'Creating Project for testing purpose',
        projectName: 'Test Cigno',
        startDateDdMmYyyy: '14/05/2026',
        endDateDdMmYyyy: '16/05/2026',
        endDateOffsetDays: 2,
      },
    },
    testCaseData: {
      tags: '@smoke @regression @client @project',
      testCase: 'TC-006',
      testDescription:
        'Create a client, open first project flow, use AI description path, and submit Create Project',
      testSummary: 'Create Client And First Project',
    },
  },
};

export function getClientProjectFlowTestCaseData(testCase: string): ClientProjectFlowTestCaseData {
  const row = clientProjectFlowTestData[testCase];
  if (!row) {
    throw new Error(`Client/project flow test data not found for: ${testCase}`);
  }
  return row;
}
