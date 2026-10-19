import type { DeliverableCrudTestCaseData } from '@interface/dashboard/deliverable-crud.interface';

const deliverableCrudTestData: { [key: string]: DeliverableCrudTestCaseData } = {
  '001-DeliverableCrudLifecycle': {
    scenario: {
      deliverableBrief: 'Develop an AI consulting market entry strategy for TC-019 CRUD validation.',
      standardProjectName: 'AI Strategy',
      geographicalScope: 'geographic',
      businessScope: 'business',
      clientSearchTerm: 'automation',
      generationProgressTimeoutMs: 35 * 60 * 1000,
      existingClientLabel: 'automation',
      existingProjectLabel: 'New project',
      initialDeliverableNameBase: 'TC019 Del',
      updatedDeliverableNameBase: 'TC019 Del Auto',
      isolationReference: {
        clientLabel: 'automation',
        projectLabel: 'New project',
        deliverableLabel: 'sample deliverable',
      },
    },
    testCaseData: {
      tags: '@regression @deliverable @crud @slow',
      testCase: 'TC-019',
      testDescription:
        'Dashboard create (TC-008) with Generate through Progress complete, read generated deliverable, rename, delete; sample deliverable unchanged',
      testSummary: 'Deliverable CRUD lifecycle via dashboard create + full generation',
    },
  },
};

export function getDeliverableCrudTestCaseData(testCase: string): DeliverableCrudTestCaseData {
  const row = deliverableCrudTestData[testCase];
  if (!row) {
    throw new Error(`Deliverable CRUD test data not found for: ${testCase}`);
  }
  return row;
}
