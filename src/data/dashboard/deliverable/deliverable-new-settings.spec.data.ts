import type { DeliverableNewSettingsTestCaseData } from '@interface/dashboard/deliverable-new-settings.interface';

const deliverableNewSettingsTestData: { [key: string]: DeliverableNewSettingsTestCaseData } = {
  '001-NewDeliverableSettings': {
    scenario: {
      existingDeliverableName: 'New deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      deliverableType: 'Recommendation',
      projectType: 'AI Strategy',
      deliverableLanguage: 'English',
      projectObjectives:
        'Develop a market entry strategy for an AI consulting offering. ' +
        'Cover target segments, competitive landscape, pricing and packaging, ' +
        'go-to-market channels, and a phased launch plan with risks and mitigations.',
      timeHorizon: 'FY2026',
      geographicalScope: 'United States',
      geographicalScopeTags: ['geographic', 'United States'],
      businessScope: 'AI consulting services',
      businessScopeTags: ['business', 'AI consulting services'],
      modeConsideration: 'Cloud-first delivery; prioritize enterprise buyers',
      documentPath: 'src/test-data/documents/ai-market-entry-brief.pdf',
      clientSearchTerm: 'automation',
      projectName: 'New project',
      deliverableName: 'New deliverable',
      stepSettleMs: 2_000,
    },
    testCaseData: {
      tags: '@regression @deliverable @settings @new-deliverable',
      testCase: 'TC-010',
      testDescription:
        'Open existing New deliverable from sidebar → Settings → fill form → Generate deliverable',
      testSummary: 'Existing New deliverable settings form and Generate',
    },
  },
};

export function getDeliverableNewSettingsTestCaseData(
  testCase: string,
): DeliverableNewSettingsTestCaseData {
  const row = deliverableNewSettingsTestData[testCase];
  if (!row) {
    throw new Error(`Deliverable new settings test data not found for: ${testCase}`);
  }
  return row;
}
