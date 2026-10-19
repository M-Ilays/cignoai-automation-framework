import type { DeliverableExportTestCaseData } from '@interface/dashboard/deliverable-export.interface';

const deliverableExportTestData: { [key: string]: DeliverableExportTestCaseData } = {
  '001-NewDeliverableExport': {
    scenario: {
      /** Fully generated storyline in automation / New project — no Reset/Generate wait. */
      deliverableName: 'sample deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      contentMarkers: ['cigno', 'market', 'strategy', 'consulting', 'automation'],
      minExportFileBytes: 20_000,
      expectedFilenameFragment: 'sample_deliverable',
      stepSettleMs: 0,
      skipGenerateWhenExportReady: true,
    },
    testCaseData: {
      tags: '@regression @deliverable @export @critical @slow',
      testCase: 'TC-015',
      testDescription:
        '1. Trigger Export · 2. Observe progress/completion · 3. Open exported PPTX · 4. Compare to on-screen',
      testSummary:
        'sample deliverable — Export, observe completion, open PPTX, compare to Executive Summary on screen',
    },
  },
};

export function getDeliverableExportTestCaseData(testCase: string): DeliverableExportTestCaseData {
  const row = deliverableExportTestData[testCase];
  if (!row) {
    throw new Error(`Deliverable export test data not found for: ${testCase}`);
  }
  return row;
}
