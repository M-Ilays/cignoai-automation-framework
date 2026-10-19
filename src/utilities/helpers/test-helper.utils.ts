import { TestCaseData } from '../../interface/base/testcase.interface';
import { TestInfo } from '@playwright/test';

export async function logTestCaseData(
  testInfo: TestInfo,
  testCaseData: TestCaseData,
): Promise<void> {
  testInfo.annotations.push({ description: `Test case: ${testCaseData.testCase}`, type: 'info' });
  testInfo.annotations.push({ description: `Test Summary: ${testCaseData.testSummary}`, type: 'info' });
  testInfo.annotations.push({ description: `Description: ${testCaseData.testDescription}`, type: 'info' });
  testInfo.annotations.push({ description: `Tags: ${testCaseData.tags}`, type: 'info' });

}
