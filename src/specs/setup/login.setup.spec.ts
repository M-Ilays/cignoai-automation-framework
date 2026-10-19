import { test } from '../../fixtures/leader-page.fixtures';
import { getSetupTestCaseData } from '../../data/setup/login.setup.spec.data';
import { getEnvVariable } from '../../utilities/helpers/env.utils';
import { storeCookies } from '../../utilities/helpers/cookies.utils';
import { logTestCaseData } from '../../utilities/helpers/test-helper.utils';

const scenario = getSetupTestCaseData('001-Admin');

test.describe('Feature: Login Setup', () => {
  test(`${scenario.testCaseData.testCase} - ${scenario.testCaseData.testSummary}`, async ({
    leaderLoginPage: loginPage,
  }) => {
    logTestCaseData(test.info(), scenario.testCaseData);

    await loginPage.loginToApp(getEnvVariable('URL'), scenario.loginPage);
    await storeCookies('admin', loginPage['page']);
  });
});
