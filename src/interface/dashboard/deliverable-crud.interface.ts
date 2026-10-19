import type { TestCaseData } from '../base/testcase.interface';
import type { DeliverableFlowScenario } from './deliverable-flow.interface';

export interface DeliverableCrudIsolationReference {
  clientLabel: string;
  projectLabel: string;
  deliverableLabel: string;
}

export interface DeliverableCrudScenario extends DeliverableFlowScenario {
  existingClientLabel: string;
  existingProjectLabel: string;
  initialDeliverableNameBase: string;
  updatedDeliverableNameBase: string;
  isolationReference: DeliverableCrudIsolationReference;
}

export interface DeliverableCrudTestCaseData {
  scenario: DeliverableCrudScenario;
  testCaseData: TestCaseData;
}
