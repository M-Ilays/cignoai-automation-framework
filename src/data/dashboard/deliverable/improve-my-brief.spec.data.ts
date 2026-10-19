import type { ImproveMyBriefTestCaseData } from '@interface/dashboard/improve-my-brief.interface';

const improveMyBriefTestData: { [key: string]: ImproveMyBriefTestCaseData } = {
  '001-ImproveMyBrief': {
    scenario: {
      existingDeliverableName: 'sample deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      seedBriefText: 'AI consulting market entry strategy.',
      intent: {
        themes: [
          'market entry',
          'ai consulting',
          'consulting',
          'strategy',
          'deliverable',
          'client',
          'segment',
        ],
        minThemesMatched: 2,
        minImprovedLength: 20,
      },
      stepSettleMs: 1_500,
      maxImproveAttempts: 3,
    },
    testCaseData: {
      tags: '@regression @deliverable @brief @improve-brief',
      testCase: 'TC-012',
      testDescription:
        'Brief stage → Improve My Brief → submit → wait for Generating your new brief (before settings complete)',
      testSummary: 'Improve My Brief AI refinement and Generate Brief flow',
    },
  },
};

export function getImproveMyBriefTestCaseData(testCase: string): ImproveMyBriefTestCaseData {
  const row = improveMyBriefTestData[testCase];
  if (!row) {
    throw new Error(`Improve My Brief test data not found for: ${testCase}`);
  }
  return row;
}
