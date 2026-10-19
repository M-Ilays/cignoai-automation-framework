import type { TestCaseData } from '../base/testcase.interface';
import type { ClientData } from '@page/dashboard/client/client.page';

export interface ClientCrudIsolationReference {
  /** Existing client that must remain after delete (e.g. automation). */
  clientLabel: string;
}

export interface ClientCrudScenario {
  /** Fields used when creating the disposable client (C). */
  createClient: Omit<ClientData, 'name'>;
  /** Base client name before rename — runtime suffix appended in the flow. */
  initialClientNameBase: string;
  /** Base client name after rename — runtime suffix appended in the flow. */
  updatedClientNameBase: string;
  isolationReference: ClientCrudIsolationReference;
}

export interface ClientCrudTestCaseData {
  scenario: ClientCrudScenario;
  testCaseData: TestCaseData;
}
