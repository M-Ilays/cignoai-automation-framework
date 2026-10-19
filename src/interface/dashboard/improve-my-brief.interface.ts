import type { TestCaseData } from '../base/testcase.interface';

/** Intent themes for AI output — wording varies; at least `minThemesMatched` must appear. */
export interface BriefImprovementIntent {
  /** Keywords/phrases expected in improved brief (case-insensitive). */
  themes: string[];
  /** Minimum number of themes that must appear in improved text. */
  minThemesMatched: number;
  /** Improved text must be at least this many characters. */
  minImprovedLength: number;
}

export interface ImproveMyBriefScenario {
  existingDeliverableName: string;
  clientLabel?: string;
  projectLabel?: string;
  /** Seed brief when the textarea is empty (Improve My Brief stays disabled). */
  seedBriefText: string;
  intent: BriefImprovementIntent;
  stepSettleMs?: number;
  /** Retries when staging shows **Failed to improve brief** (transient AI errors). */
  maxImproveAttempts?: number;
}

export interface ImproveMyBriefTestCaseData {
  scenario: ImproveMyBriefScenario;
  testCaseData: TestCaseData;
}
