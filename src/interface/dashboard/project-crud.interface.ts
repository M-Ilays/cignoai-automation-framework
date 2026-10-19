import type { TestCaseData } from '../base/testcase.interface';
import type { ClientProjectFlowProjectInput } from './client-project-flow.interface';

export interface ProjectCrudIsolationReference {
  /** Existing client that must remain after delete (e.g. automation). */
  clientLabel: string;
  /** Existing project under that client that must remain (e.g. New project). */
  projectLabel: string;
}

export interface ProjectCrudScenario {
  /** Existing sidebar client used for create/update/delete (not created in-test). */
  existingClientLabel: string;
  project: ClientProjectFlowProjectInput;
  /** Base name before rename — runtime suffix is appended in the flow. */
  initialProjectNameBase: string;
  /** Base name after rename — runtime suffix is appended in the flow. */
  updatedProjectNameBase: string;
  /** Another project under the same (or other) client that must not be affected. */
  isolationReference: ProjectCrudIsolationReference;
}

export interface ProjectCrudTestCaseData {
  scenario: ProjectCrudScenario;
  testCaseData: TestCaseData;
}
