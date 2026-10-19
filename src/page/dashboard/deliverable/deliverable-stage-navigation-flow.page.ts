import type { DeliverableStageNavigationTestCaseData } from '@interface/dashboard/deliverable-stage-navigation.interface';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import {
  DeliverableStageNavigationPage,
  type DeliverableStageSnapshot,
  type StageNavigationTiming,
} from '@page/dashboard/deliverable/deliverable-stage-navigation.page';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

export class DeliverableStageNavigationFlowPage {
  private readonly page: Page;
  private readonly clientSearchPage: ClientSearchPage;
  private readonly deliverablePage: DeliverablePage;
  private readonly stagePage: DeliverableStageNavigationPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
    this.deliverablePage = new DeliverablePage(page, testInfo);
    this.stagePage = new DeliverableStageNavigationPage(page, testInfo);
  }

  /**
   * TC-009: open existing deliverable → Brief ↔ Settings → performance + state retention.
   */
  public async runValidateStageNavigationAndPerformance(
    bundle: DeliverableStageNavigationTestCaseData,
  ): Promise<void> {
    const scenario = bundle.scenario;
    const maxMs = scenario.maxStageLoadMs ?? 8_000;
    const timings: StageNavigationTiming[] = [];

    await test.step('Open application (saved session cookies only)', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step(`Open deliverable "${scenario.deliverableName}"`, async () => {
      await this.clientSearchPage.openDeliverableFromSidebar(scenario.deliverableName, {
        clientLabel: scenario.clientLabel,
        projectLabel: scenario.projectLabel,
        skipStageReadyWait: true,
      });
      await this.clientSearchPage.waitForDeliverableOpenInMainView(scenario.deliverableName);
      await this.clientSearchPage.confirmStorylineGenerationLeaveIfPrompted();
      await this.deliverablePage.dismissBlockingDeliverablePanels();
    });

    await this.stagePage.assertStageStepperVisible();

    let briefSnapshot: DeliverableStageSnapshot = { briefText: '', settingsExcerpt: '' };
    let settingsSnapshot: DeliverableStageSnapshot = { briefText: '', settingsExcerpt: '' };

    await test.step('Capture Brief stage state', async () => {
      const timing = await this.stagePage.navigateToStage('Brief', scenario);
      if (timing) {
        timings.push(timing);
      }
      briefSnapshot = await this.stagePage.captureStageSnapshot('Brief');
      test.expect(briefSnapshot.briefText.length, 'Brief stage should contain text').toBeGreaterThan(
        10,
      );
    });

    await test.step('Navigate to Settings and capture state', async () => {
      const timing = await this.stagePage.navigateToStage('Settings', scenario, 'Brief');
      if (timing) {
        timings.push(timing);
      }
      settingsSnapshot = await this.stagePage.captureStageSnapshot('Settings');
      test.expect(
        settingsSnapshot.settingsExcerpt.length,
        'Settings should contain Work details / scope content',
      ).toBeGreaterThan(0);
    });

    await test.step('Return to Brief — verify retention and load time', async () => {
      const timing = await this.stagePage.navigateToStage('Brief', scenario, 'Settings');
      if (timing) {
        timings.push(timing);
      }
      const briefAgain = await this.stagePage.captureStageSnapshot('Brief');
      this.stagePage.assertSnapshotsMatch('Brief after Settings → Brief', briefSnapshot, briefAgain);
    });

    await test.step('Return to Settings — verify retention and load time', async () => {
      const timing = await this.stagePage.navigateToStage('Settings', scenario, 'Brief');
      if (timing) {
        timings.push(timing);
      }
      const settingsAgain = await this.stagePage.captureStageSnapshot('Settings');
      this.stagePage.assertSnapshotsMatch(
        'Settings after Brief → Settings',
        settingsSnapshot,
        settingsAgain,
      );
    });

    await test.step('Assert stage transition performance', async () => {
      this.stagePage.assertTimingsWithinBudget(timings, maxMs);
      await this.stagePage.attachNavigationTimings(timings);
    });
  }
}
