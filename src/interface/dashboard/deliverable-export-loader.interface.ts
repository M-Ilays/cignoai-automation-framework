import type { TestCaseData } from '../base/testcase.interface';

export interface DeliverableExportLoaderScenario {
  deliverableName: string;
  clientLabel?: string;
  projectLabel?: string;
  /** Extra Export clicks while the first export is running. */
  repeatedClickCount?: number;
  stepSettleMs?: number;
}

export interface DeliverableExportLoaderTestCaseData {
  scenario: DeliverableExportLoaderScenario;
  testCaseData: TestCaseData;
}
