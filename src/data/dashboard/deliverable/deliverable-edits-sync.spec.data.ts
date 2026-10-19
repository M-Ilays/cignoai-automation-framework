import type { DeliverableEditsSyncTestCaseData } from '@interface/dashboard/deliverable-edits-sync.interface';

const deliverableEditsSyncTestData: { [key: string]: DeliverableEditsSyncTestCaseData } = {
  '001-NewDeliverableEditsSync': {
    scenario: {
      deliverableName: 'sample deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      syncMarker: 'New edited text in Test Cigno Deliverable',
      stepSettleMs: 0,
      regenerateAfterSettingsTimeoutMs: 35 * 60_000,
    },
    testCaseData: {
      tags: '@regression @deliverable @sync @slow',
      testCase: 'TC-017',
      testDescription:
        'sample deliverable — Brief + Settings edits → Reset / Regenerate → return to prior views and verify sync',
      testSummary:
        'sample deliverable — edit Brief/Settings, regenerate, verify marker retained across Brief/Settings/Deliverable',
    },
  },
};

export function getDeliverableEditsSyncTestCaseData(
  testCase: string,
): DeliverableEditsSyncTestCaseData {
  const row = deliverableEditsSyncTestData[testCase];
  if (!row) {
    throw new Error(`Deliverable edits sync test data not found for: ${testCase}`);
  }
  return row;
}
