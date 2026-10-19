import type { ChatAssistantTestCaseData } from '@interface/dashboard/chat-assistant.interface';

const chatAssistantTestData: { [key: string]: ChatAssistantTestCaseData } = {
  '001-NewDeliverableChat': {
    scenario: {
      deliverableName: 'New deliverable',
      clientLabel: 'automation',
      projectLabel: 'New project',
      userPrompt:
        'Based on this deliverable brief, what is the main topic and does it relate to Test Cigno?',
      requiredMentions: ['cigno'],
      responseIntent: {
        themes: [
          'brief',
          'topic',
          'main',
          'deliverable',
          'context',
          'related',
          'test cigno',
          'cigno',
          'market',
          'strategy',
          'consulting',
          'ai',
        ],
        minThemesMatched: 1,
        minResponseLength: 40,
      },
      leakMarkers: [
        'BNP Paribas',
        'Goldman Sachs',
        'Eastnets',
        'UBS Switzerland',
        'Euronext',
        'Swiss Life',
        'Fixed Income Strategy',
        'Product strategy reco',
      ],
      forbiddenPhrases: [
        "i'm sorry, but i don't have access",
        'default route is taken',
        'no conversation history or indication that a deliverable',
      ],
      stepSettleMs: 0,
    },
    testCaseData: {
      tags: '@regression @deliverable @chat-assistant',
      testCase: 'TC-014',
      testDescription:
        'New deliverable → open Chat Assistant → context prompt about Test Cigno → relevant reply, no leak → close/reopen',
      testSummary: 'Chat Assistant availability and contextual response',
    },
  },
};

export function getChatAssistantTestCaseData(testCase: string): ChatAssistantTestCaseData {
  const row = chatAssistantTestData[testCase];
  if (!row) {
    throw new Error(`Chat Assistant test data not found for: ${testCase}`);
  }
  return row;
}
