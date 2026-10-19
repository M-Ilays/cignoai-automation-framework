import type { TestCaseData } from '../base/testcase.interface';

export interface DeliverableReadUpdateIsolationReference {
  clientLabel: string;
  projectLabel: string;
  deliverableLabel: string;
}

export interface DeliverableReadUpdateScenario {
  deliverableName: string;
  clientLabel: string;
  projectLabel: string;
  clientSearchTerm: string;
  /** Substring appended to Settings fields (e.g. Test Cigno Deliverable updated fields). */
  updateMarker: string;
  isolationReference: DeliverableReadUpdateIsolationReference;
  stepSettleMs?: number;
}

export interface DeliverableReadUpdateTestCaseData {
  scenario: DeliverableReadUpdateScenario;
  testCaseData: TestCaseData;
}
