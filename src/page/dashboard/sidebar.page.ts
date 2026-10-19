import { test, Page, TestInfo } from '@playwright/test';
import { PlaywrightActionsFactory } from '../../utilities/playwright/playwright-actions.utils';

export class DMSidebar {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly playwrightActionsFactory: PlaywrightActionsFactory;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.playwrightActionsFactory = new PlaywrightActionsFactory(
      this.page,
      this.testInfo,
    );
  }

  public async navigateToURL(): Promise<void> {
    await test.step(`Navigate to application`, async () => {
      const baseUrl = process.env.BASE_URL || '';
      await this.playwrightActionsFactory.navigateToURL(baseUrl);
      await this.playwrightActionsFactory.waitForDomLoad();
    });
  }
}
