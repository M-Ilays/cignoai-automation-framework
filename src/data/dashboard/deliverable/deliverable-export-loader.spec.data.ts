import type { DeliverableExportLoaderTestCaseData } from '@interface/dashboard/deliverable-export-loader.interface';

const deliverableExportLoaderTestData: {
  [key: string]: DeliverableExportLoaderTestCaseData;
} = {
  '001-SampleDeliverableExportLoader': {
    scenario: {
      deliverableName: 'sample deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      repeatedClickCount: 5,
      stepSettleMs: 0,
    },
    testCaseData: {
      tags: '@regression @deliverable @export @loader @slow',
      testCase: 'TC-016',
      testDescription:
        '1. Trigger Export · 2. Validate loader/disabled/promise · 3. Repeated clicks blocked → resolves',
      testSummary:
        'Export loader validation on pre-generated sample deliverable (no Generate wait)',
    },
  },
};

export function getDeliverableExportLoaderTestCaseData(
  testCase: string,
): DeliverableExportLoaderTestCaseData {
  const row = deliverableExportLoaderTestData[testCase];
  if (!row) {
    throw new Error(`Deliverable export loader test data not found for: ${testCase}`);
  }
  return row;
}
