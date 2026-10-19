import type { TestCaseData } from '../base/testcase.interface';

export interface ClientProjectFlowClientInput {
  name: string;
  website: string;
  industry: string;
  description?: string;
}

export interface ClientProjectFlowProjectInput {
  /** Shown after choosing “Type in a project description”. */
  aiProjectDescription: string;
  /** Filled on the screen after “Generate project” (with start/end dates). */
  projectName: string;
  /**
   * Calendar start as **dd/MM/yyyy** in test data. On the Review step, native `input[type=date]`
   * is filled as **yyyy-MM-dd** (same calendar day).
   */
  startDateDdMmYyyy?: string;
  /**
   * Calendar end as **dd/MM/yyyy** in test data. Mapped to **yyyy-MM-dd** for native date inputs.
   */
  endDateDdMmYyyy?: string;
  /**
   * Used only when {@link endDateDdMmYyyy} is omitted: end = start + this many calendar days (min 1).
   */
  endDateOffsetDays: number;
  /**
   * When set, after the project is created the flow opens **Deliverables** on project detail, uses **+**,
   * and fills this text as the deliverable brief (modal/sheet).
   */
  deliverableBrief?: string;
}

export interface ClientProjectFlowScenario {
  client: ClientProjectFlowClientInput;
  project: ClientProjectFlowProjectInput;
}

/** Shape of each row in `client-project-flow.spec.data.ts` (scenario + Jira-style metadata). */
export interface ClientProjectFlowTestCaseData {
  scenario: ClientProjectFlowScenario;
  testCaseData: TestCaseData;
}
