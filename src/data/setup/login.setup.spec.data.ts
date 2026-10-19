import { TestCaseData } from '../../interface/base/testcase.interface';
import { Login } from '../../interface/setup/login.interface';
import { getEnvVariable } from '../../utilities/helpers/env.utils';

export interface LoginTestCaseData {
  loginPage: Login;
  testCaseData: TestCaseData;
}

const loginTestData: { [key: string]: LoginTestCaseData } = {
  '001-Admin': {
    loginPage: {
      Email: getEnvVariable('EMAIL'),
      Password: getEnvVariable('PASSWORD'),
    },
    testCaseData: {
      tags: '@smoke @regression @setup @admin @login',
      testCase: 'TC-001',
      testDescription: 'Validate the admin user can login and store cookies',
      testSummary: 'Admin User Login',
    },
  },
};

export function getSetupTestCaseData(testCase: string): LoginTestCaseData {
  const data = loginTestData[testCase];
  if (!data) {
    throw new Error(`Test case data not found for: ${testCase}`);
  }
  return data;
}
