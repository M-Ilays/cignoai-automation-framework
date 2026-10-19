import { TestCaseData } from '../../interface/base/testcase.interface';
import { DMRandomData } from '../../interface/sanity/sidebar.interface';

interface LeadsPageData {
  testCaseData: TestCaseData;
  randomData?: DMRandomData;
}

const getLeadsPage: { [key: string]: LeadsPageData } = {
  // Add test case data here
};

export function getLeadsPageData(testCase: string): LeadsPageData {
  const data = getLeadsPage[testCase];
  if (!data) {
    throw new Error(`Test case data not found for: ${testCase}`);
  }
  return data;
}
