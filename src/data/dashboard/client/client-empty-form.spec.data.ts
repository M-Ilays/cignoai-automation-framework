import { TestCaseData } from '../../../interface/base/testcase.interface';
import { EmptyClientFormScenario } from '../../../interface/dashboard/client-empty-form.interface';

export interface ClientEmptyFormTestCaseData {
  scenario: EmptyClientFormScenario;
  testCaseData: TestCaseData;
}

const clientEmptyFormTestData: { [key: string]: ClientEmptyFormTestCaseData } = {
  '001-EmptyNewClientForm': {
    scenario: { variant: 'all-fields-empty' },
    testCaseData: {
      tags: '@negative @regression @client @form',
      testCase: 'TC-005',
      testDescription:
        'Open new client form, focus required fields without typing, Save stays disabled, then Cancel',
      testSummary: 'New Client Form — Empty Details',
    },
  },
};

export function getClientEmptyFormTestCaseData(testCase: string): ClientEmptyFormTestCaseData {
  const data = clientEmptyFormTestData[testCase];
  if (!data) {
    throw new Error(`Empty client form test data not found for: ${testCase}`);
  }
  return data;
}
