import { TC010_STEP_SETTLE_MS } from '@data/dashboard/deliverable/deliverable-new-settings.timeouts';
import type { DeliverableNewSettingsTestCaseData } from '@interface/dashboard/deliverable-new-settings.interface';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/**
 * TC-010: Open **existing** deliverable (sidebar) → **Settings** → full form → **Generate**.
 * Does **not** use dashboard Build / create-new flow (no generation from scratch).
 */
export class NewDeliverableSettingsFlowPage {
  private readonly page: Page;
  private readonly clientSearchPage: ClientSearchPage;
  private readonly deliverablePage: DeliverablePage;
  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
    this.deliverablePage = new DeliverablePage(page, testInfo);
  }

  private async pause(stepLabel: string, settleMs: number): Promise<void> {
    await test.step(`Observe (${settleMs / 1000}s): ${stepLabel}`, async () => {
      await this.page.waitForTimeout(settleMs);
    });
  }

  public async runNewDeliverableSettingsWorkflow(
    bundle: DeliverableNewSettingsTestCaseData,
  ): Promise<void> {
    const scenario = bundle.scenario;
    const deliverableName = scenario.existingDeliverableName.trim();
    const settle = scenario.stepSettleMs ?? TC010_STEP_SETTLE_MS;

    await test.step('Open application (saved session cookies only)', async () => {
      await gotoAppHomeWithSession(this.page);
      await this.pause('application loaded', settle);
    });

    await test.step(`Open "${deliverableName}" and go to Settings`, async () => {
      await this.clientSearchPage.openDeliverableFromSidebar(deliverableName, {
        clientLabel: scenario.clientLabel,
        projectLabel: scenario.projectLabel,
      });
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.deliverablePage.goToSettingsStage();
    });

    await test.step('Fill Settings form and Generate deliverable (steps 2–13)', async () => {
      await this.deliverablePage.runNewDeliverableSettingsAndGenerate(scenario);
    });
  }
}
