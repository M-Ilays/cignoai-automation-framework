import type { DeliverableSettingsSourceTestCaseData } from '@interface/dashboard/deliverable-settings-source.interface';

const deliverableSettingsSourceTestData: {
  [key: string]: DeliverableSettingsSourceTestCaseData;
} = {
  '001-SettingsSourceUpload': {
    scenario: {
      targetDeliverableName: 'New deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      projectName: 'New project',
      documentPath: 'src/test-data/documents/ai-market-entry-brief.pdf',
      expectedFileName: 'ai-market-entry-brief.pdf',
      isolationDeliverableName: 'sample deliverable',
      stepSettleMs: 2_000,
    },
    testCaseData: {
      tags: '@regression @deliverable @settings @source-upload',
      testCase: 'TC-013',
      testDescription:
        'Upload on New deliverable → Generate → sample deliverable Settings must not show that file',
      testSummary:
        'Uploaded source on New deliverable is isolated and must not appear on sample deliverable',
    },
  },
};

export function getDeliverableSettingsSourceTestCaseData(
  testCase: string,
): DeliverableSettingsSourceTestCaseData {
  const row = deliverableSettingsSourceTestData[testCase];
  if (!row) {
    throw new Error(`Deliverable settings source test data not found for: ${testCase}`);
  }
  return row;
}
