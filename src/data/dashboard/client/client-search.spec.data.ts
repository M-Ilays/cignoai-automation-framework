import { TestCaseData } from '../../../interface/base/testcase.interface';
import {
  ClientSearchNegativeScenario,
  ClientSearchScenario,
} from '../../../interface/dashboard/client-search.interface';

export interface ClientSearchTestCaseData {
  scenario: ClientSearchScenario;
  testCaseData: TestCaseData;
}

export interface ClientSearchNegativeTestCaseData {
  scenario: ClientSearchNegativeScenario;
  testCaseData: TestCaseData;
}

const clientSearchTestData: { [key: string]: ClientSearchTestCaseData } = {
  '001-SearchClient': {
    scenario: {
      searchTerm: 'Hassan Ahmad',
      clientLabelToSelect: 'Hassan Ahmad',
    },
    testCaseData: {
      tags: '@smoke @regression @client @search',
      testCase: 'TC-003',
      testDescription: 'Search for a client, open it from results, and verify details are shown',
      testSummary: 'Search Client',
    },
  },
};

const clientSearchNegativeTestData: { [key: string]: ClientSearchNegativeTestCaseData } = {
  '002-SearchNonExistentClient': {
    scenario: {
      nonExistentClientName: 'non existent client',
    },
    testCaseData: {
      tags: '@negative @regression @client @search',
      testCase: 'TC-004',
      testDescription:
        'Search for a client that does not exist — no match in sidebar, then clear the search field',
      testSummary: 'Search Non-Existent Client',
    },
  },
};

export function getClientSearchTestCaseData(testCase: string): ClientSearchTestCaseData {
  const data = clientSearchTestData[testCase];
  if (!data) {
    throw new Error(`Test case data not found for: ${testCase}`);
  }
  return data;
}

export function getClientSearchNegativeTestCaseData(testCase: string): ClientSearchNegativeTestCaseData {
  const data = clientSearchNegativeTestData[testCase];
  if (!data) {
    throw new Error(`Negative test case data not found for: ${testCase}`);
  }
  return data;
}
