import type { ClientCrudTestCaseData } from '@interface/dashboard/client-crud.interface';

const clientCrudTestData: { [key: string]: ClientCrudTestCaseData } = {
  '001-ClientCrudLifecycle': {
    scenario: {
      createClient: {
        website: 'https://www.daraz.pk/#?',
        industry: 'Technology',
        description: 'TC-021 disposable client for CRUD validation',
      },
      initialClientNameBase: 'TC021 Client',
      updatedClientNameBase: 'TC021 Client Auto',
      isolationReference: {
        clientLabel: 'automation',
      },
    },
    testCaseData: {
      tags: '@regression @client @crud',
      testCase: 'TC-021',
      testDescription:
        'Create new client, verify in tree, rename, verify update, delete client, verify cleanup without impacting automation client',
      testSummary: 'Client CRUD lifecycle (create, read, update, delete)',
    },
  },
};

export function getClientCrudTestCaseData(testCase: string): ClientCrudTestCaseData {
  const row = clientCrudTestData[testCase];
  if (!row) {
    throw new Error(`Client CRUD test data not found for: ${testCase}`);
  }
  return row;
}
