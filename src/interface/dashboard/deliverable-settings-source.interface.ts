import type { TestCaseData } from '../base/testcase.interface';

/** TC-013 — attach supported source at Settings and verify record isolation. */
export interface DeliverableSettingsSourceScenario {
  /** Deliverable that receives the upload. */
  targetDeliverableName: string;
  clientLabel?: string;
  projectLabel?: string;
  /** **Work details → Project Name** — required before **Generate deliverable**. */
  projectName: string;
  /** Relative path to a supported file (PDF, DOC, etc.). */
  documentPath: string;
  /** Basename used for assertions (defaults from documentPath). */
  expectedFileName?: string;
  /** Another deliverable that must not show this source. */
  isolationDeliverableName: string;
  isolationClientLabel?: string;
  isolationProjectLabel?: string;
  stepSettleMs?: number;
}

export interface DeliverableSettingsSourceTestCaseData {
  scenario: DeliverableSettingsSourceScenario;
  testCaseData: TestCaseData;
}
