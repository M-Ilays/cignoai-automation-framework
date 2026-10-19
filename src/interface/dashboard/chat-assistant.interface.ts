import type { TestCaseData } from '../base/testcase.interface';

/** Themes expected in a context-aware assistant reply (wording may vary). */
export interface ChatAssistantResponseIntent {
  themes: string[];
  minThemesMatched: number;
  minResponseLength: number;
}

/** Phrases that must not appear — unrelated records from other clients/deliverables. */
export interface ChatAssistantScenario {
  deliverableName: string;
  clientLabel?: string;
  projectLabel?: string;
  /** Context-based user message (TC-014: prompt about Test Cigno). */
  userPrompt: string;
  /** Terms the reply must mention when the prompt references deliverable context (e.g. Test Cigno). */
  requiredMentions?: string[];
  responseIntent: ChatAssistantResponseIntent;
  /** Substrings that indicate leaked unrelated workspace content. */
  leakMarkers: string[];
  /** Non-answers that mean the assistant ignored deliverable context. */
  forbiddenPhrases: string[];
  stepSettleMs?: number;
}

export interface ChatAssistantTestCaseData {
  scenario: ChatAssistantScenario;
  testCaseData: TestCaseData;
}
