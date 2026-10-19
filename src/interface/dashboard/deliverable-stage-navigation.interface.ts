import type { TestCaseData } from '../base/testcase.interface';

export type DeliverableEditorStage = 'Brief' | 'Settings' | 'Deliverable';

export interface DeliverableStageNavigationScenario {
  /** Sidebar / tree label (e.g. sample deliverable). */
  deliverableName: string;
  /** Optional — narrows tree when multiple matches exist. */
  clientLabel?: string;
  /** Optional — expand project before opening deliverable. */
  projectLabel?: string;
  /** Max ms allowed for a stage panel to become ready after tab click. */
  maxStageLoadMs?: number;
  /** Pause after stage is ready (default 5s for TC-009 observe; use 0–500 for TC-010). */
  stageSettleMs?: number;
}

export interface DeliverableStageNavigationTestCaseData {
  scenario: DeliverableStageNavigationScenario;
  testCaseData: TestCaseData;
}
