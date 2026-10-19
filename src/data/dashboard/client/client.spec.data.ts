import { TestCaseData } from '../../../interface/base/testcase.interface';
import { ClientData } from '../../../page/dashboard/client/client.page';

export interface ClientTestCaseData {
  clientData: ClientData;
  testCaseData: TestCaseData;
}

const clientTestData: { [key: string]: ClientTestCaseData } = {
  '001-CreateClient': {
    clientData: {
      name: 'Automation',
      website: 'https://www.daraz.pk/#?',
      industry: 'Marketing',
      description: 'Daraz is an eCommerce Platform.',
    },
    testCaseData: {
      tags: '@smoke @regression @client',
      testCase: 'TC-002',
      testDescription: 'Validate that a new client can be created successfully',
      testSummary: 'Create New Client',
    },
  },
};

export function getClientTestCaseData(testCase: string): ClientTestCaseData {
  const data = clientTestData[testCase];
  if (!data) {
    throw new Error(`Test case data not found for: ${testCase}`);
  }
  return data;
}
