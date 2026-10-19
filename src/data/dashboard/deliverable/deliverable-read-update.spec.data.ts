import type { DeliverableReadUpdateTestCaseData } from '@interface/dashboard/deliverable-read-update.interface';

const deliverableReadUpdateTestData: { [key: string]: DeliverableReadUpdateTestCaseData } = {
  '001-NewDeliverableReadUpdate': {
    scenario: {
      deliverableName: 'New deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      clientSearchTerm: 'automation',
      updateMarker: 'Test Cigno Deliverable updated fields',
      isolationReference: {
        clientLabel: 'automation',
        projectLabel: 'New project',
        deliverableLabel: 'sample deliverable',
      },
    },
    testCaseData: {
      tags: '@regression @deliverable @read-update @new-deliverable @critical',
      testCase: 'TC-018',
      testDescription:
        '1. Open New deliverable · 2. View details · 3. Update Settings fields · 4. Reopen Settings in place and verify · isolation on sample deliverable',
      testSummary:
        'Read and update New deliverable Settings only; changes persist only on new record',
    },
  },
};

export function getDeliverableReadUpdateTestCaseData(
  testCase: string,
): DeliverableReadUpdateTestCaseData {
  const row = deliverableReadUpdateTestData[testCase];
  if (!row) {
    throw new Error(`Deliverable read/update test data not found for: ${testCase}`);
  }
  return row;
}
