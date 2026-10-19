import { LocatorDetails } from '../../interface/base/locator.interface';
import { test, Page, TestInfo } from '@playwright/test';
import { PlaywrightActionsFactory } from '../../utilities/playwright/playwright-actions.utils';
import { Login } from '../../interface/setup/login.interface';

export class LoginPage {
  private readonly page: Page;
  private readonly actions: PlaywrightActionsFactory;
  private readonly locators: { [key: string]: LocatorDetails };

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.actions = new PlaywrightActionsFactory(page, testInfo);

    this.locators = {
      emailInput: {
        description: 'Auth0 Email input',
        locator: page.locator('input#username'),
      },
      passwordInput: {
        description: 'Auth0 Password input',
        locator: page.locator('input#password'),
      },
      continueButton: {
        description: 'Auth0 Continue button',
        locator: page.getByRole('button', { name: 'Continue' }),
      },
    };
  }

  public async navigateToApp(url: string): Promise<void> {
    await test.step('Navigate to application', async () => {
      await this.actions.navigateToURL(url);
    });
  }

  public async waitForAuth0Redirect(): Promise<void> {
    await test.step('Wait for Auth0 redirect', async () => {
      await this.page.waitForURL('**/u/login**', { timeout: 15000 });
      await this.actions.waitForDomLoad();
    });
  }

  public async enterCredentials(credentials: Login): Promise<void> {
    await test.step('Enter email', async () => {
      await this.actions.sendKeys(this.locators.emailInput, credentials.Email, true);
    });

    await test.step('Enter password', async () => {
      await this.actions.sendKeys(this.locators.passwordInput, credentials.Password, true);
    });
  }

  public async clickContinue(): Promise<void> {
    await test.step('Click Continue', async () => {
      await this.actions.click(this.locators.continueButton);
    });
  }

  public async waitForSuccessfulLogin(appUrl: string): Promise<void> {
    await test.step('Wait for successful login redirect', async () => {
      const domain = appUrl.replace('https://', '').replace('http://', '');
      await this.page.waitForURL((url) => url.href.includes(domain), { timeout: 30000 });
      await this.actions.waitForNetworkIdle();
    });
  }

  public async loginToApp(url: string, credentials: Login): Promise<void> {
    await this.navigateToApp(url);
    await this.waitForAuth0Redirect();
    await this.enterCredentials(credentials);
    await this.clickContinue();
    await this.waitForSuccessfulLogin(url);
  }

  public async ensureLoggedIn(appUrl: string, credentials: Login): Promise<void> {
    await test.step('Ensure logged in (cookies or Auth0)', async () => {
      await this.actions.navigateToURL(appUrl);
      await this.page.waitForLoadState('load');
      const needsLogin =
        this.page.url().includes('auth0.com') || this.page.url().includes('/u/login');
      if (needsLogin) {
        await this.actions.waitForDomLoad();
        await this.page.locator('input#username').waitFor({ state: 'visible', timeout: 15000 });
        await this.enterCredentials(credentials);
        await this.clickContinue();
        await this.waitForSuccessfulLogin(appUrl);
      }
    });
  }
}
