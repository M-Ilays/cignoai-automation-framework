import type { TestCaseData } from '../base/testcase.interface';

export interface DeliverableFlowScenario {
  deliverableBrief: string;
  /** Card to pick in **Select Standard Project** modal (default: AI Strategy). */
  standardProjectName?: string;
  /** Value for **Geographical Scope** (+ Add). */
  geographicalScope?: string;
  /** Value for **Business Scope** (+ Add). */
  businessScope?: string;
  /** **Client Name** search term (e.g. automation). */
  clientSearchTerm?: string;
  /** Override wait for Progress complete (default ~20 min). */
  generationProgressTimeoutMs?: number;
}

export interface DeliverableFlowTestCaseData {
  scenario: DeliverableFlowScenario;
  testCaseData: TestCaseData;
}
