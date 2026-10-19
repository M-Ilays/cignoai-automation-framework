import type { DeliverableFlowTestCaseData } from '@interface/dashboard/deliverable-flow.interface';

const dashboardDeliverableFlowTestData: { [key: string]: DeliverableFlowTestCaseData } = {
  '001-DashboardDeliverable': {
    scenario: {
      deliverableBrief: 'Develop an AI consulting market entry strategy.',
      standardProjectName: 'AI Strategy',
      geographicalScope: 'geographic',
      businessScope: 'business',
      clientSearchTerm: 'automation',
      generationProgressTimeoutMs: 35 * 60 * 1000,
    },
    testCaseData: {
      tags: '@regression @deliverable @dashboard @slow',
      testCase: 'TC-008',
      testDescription:
        'E2E dashboard deliverable: brief → Build → AI Strategy → deliverable mode submit → settings (scope/client) → Generate deliverable → Progress complete (~10–18 min)',
      testSummary:
        '10-step flow: home prompt → standard project card → Add Agent → send → settings sheet → geo/biz scope → automation client → Generate → wait Progress',
    },
  },
};

export function getDashboardDeliverableFlowTestCaseData(testCase: string): DeliverableFlowTestCaseData {
  const row = dashboardDeliverableFlowTestData[testCase];
  if (!row) {
    throw new Error(`Dashboard deliverable flow test data not found for: ${testCase}`);
  }
  return row;
}
