import { TestCaseData } from '../../interface/base/testcase.interface';

interface LoginPageData {
  testCaseData: TestCaseData;
}

const loginTestData: { [key: string]: LoginPageData } = {
  '001-admin': {
    testCaseData: {
      
      tags: '@smoke @regression @login @admin',
      testCase: '001-admin',
      testDescription: 'Validate the admin user login functionality and cookie management.',
      testSummary: 'Verify that the Admin User can successfully log in.',
    },
  },
};

export function getLoginTestCaseData(testCase: string): LoginPageData {
  const data = loginTestData[testCase];
  if (!data) {
    throw new Error(`Test case data not found for: ${testCase}`);
  }
  return data;
}
