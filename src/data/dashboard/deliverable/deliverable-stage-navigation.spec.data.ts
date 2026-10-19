import type { DeliverableStageNavigationTestCaseData } from '@interface/dashboard/deliverable-stage-navigation.interface';

const deliverableStageNavigationTestData: {
  [key: string]: DeliverableStageNavigationTestCaseData;
} = {
  '001-SampleDeliverableStages': {
    scenario: {
      deliverableName: 'sample deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      maxStageLoadMs: 15_000,
      stageSettleMs: 500,
    },
    testCaseData: {
      tags: '@regression @deliverable @navigation @performance',
      testCase: 'TC-009',
      testDescription:
        'Open existing deliverable, navigate Brief ↔ Settings, assert load time and field retention',
      testSummary: 'Validate stage navigation and performance on sample deliverable',
    },
  },
};

export function getDeliverableStageNavigationTestCaseData(
  testCase: string,
): DeliverableStageNavigationTestCaseData {
  const row = deliverableStageNavigationTestData[testCase];
  if (!row) {
    throw new Error(`Deliverable stage navigation test data not found for: ${testCase}`);
  }
  return row;
}
