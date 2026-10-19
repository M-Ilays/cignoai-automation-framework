import type { DeliverableFlowTestCaseData } from '@interface/dashboard/deliverable-flow.interface';
import { Page, test, TestInfo } from '@playwright/test';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/**
 * TC-008 orchestration — mirrors staging user flow observed via Playwright MCP.
 */
export class DashboardDeliverableFlowPage {
  private readonly page: Page;
  private readonly deliverablePage: DeliverablePage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.deliverablePage = new DeliverablePage(page, testInfo);
  }

  /**
   * Full dashboard → deliverable creation (see {@link DeliverablePage} for step implementation).
   */
  public async runCreateDeliverableFromDashboard(bundle: DeliverableFlowTestCaseData): Promise<void> {
    const brief = bundle.scenario.deliverableBrief?.trim();
    if (!brief) {
      throw new Error('Dashboard deliverable flow requires scenario.deliverableBrief.');
    }

    const scenario = { ...bundle.scenario, deliverableBrief: brief };
    const standardProject = scenario.standardProjectName?.trim() || 'AI Strategy';

    await test.step('Open application (saved session cookies only)', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step('Step 1–2: Dashboard home — enter brief, Build a Deliverable', async () => {
      await this.deliverablePage.runDashboardBriefAndBuild(scenario);
    });

    await test.step(`Step 3–4: Select standard project "${standardProject}" → Add This Agent`, async () => {
      await this.deliverablePage.runSelectStandardProjectAndAddAgent(standardProject);
    });

    await test.step('Step 5: Deliverable mode — send, then wait for settings sheet', async () => {
      await this.deliverablePage.runDeliverableModeSubmit(standardProject);
    });

    await test.step('Step 6–8: Fill settings — scope, client, Generate deliverable', async () => {
      await this.deliverablePage.runDeliverableSettingsForm(scenario);
    });

    await test.step('Step 9–10: Wait for generation — Progress complete (~10–18 min)', async () => {
      await this.deliverablePage.runWaitForGenerationComplete(scenario);
    });
  }
}
