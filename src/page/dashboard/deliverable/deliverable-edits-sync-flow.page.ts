import {
  TC017_REGENERATE_TIMEOUT_MS,
  TC017_STEP_SETTLE_MS,
} from '@data/dashboard/deliverable/deliverable-edits-sync.timeouts';
import type { DeliverableEditsSyncTestCaseData } from '@interface/dashboard/deliverable-edits-sync.interface';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverableEditsSyncPage } from '@page/dashboard/deliverable/deliverable-edits-sync.page';
import { DeliverableExportPage } from '@page/dashboard/deliverable/deliverable-export.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/**
 * TC-017 — sample deliverable (steps only):
 * 1. Edit Brief + Settings
 * 2. Reset / Regenerate
 * 3. Return to prior views and verify sync
 */
export class DeliverableEditsSyncFlowPage {
  private readonly page: Page;
  private readonly clientSearchPage: ClientSearchPage;
  private readonly editsSyncPage: DeliverableEditsSyncPage;
  private readonly deliverablePage: DeliverablePage;
  private readonly exportPage: DeliverableExportPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
    this.editsSyncPage = new DeliverableEditsSyncPage(page, testInfo);
    this.deliverablePage = new DeliverablePage(page, testInfo);
    this.exportPage = new DeliverableExportPage(page, testInfo);
  }

  private async openSampleDeliverableFromSearch(
    deliverableName: string,
    clientLabel?: string,
    projectLabel?: string,
  ): Promise<void> {
    await this.clientSearchPage.openDeliverableFromSidebar(deliverableName, {
      clientLabel,
      projectLabel,
      skipStageReadyWait: true,
    });
    await this.clientSearchPage.confirmStorylineGenerationLeaveIfPrompted();
    await this.exportPage.waitForSampleDeliverableStorylineOutput();
    await this.exportPage.ensureSampleDeliverableReadyForExport(this.deliverablePage);
    this.editsSyncPage.setDeliverableContext(deliverableName);
  }

  public async runEditsSyncWorkflow(bundle: DeliverableEditsSyncTestCaseData): Promise<void> {
    const scenario = bundle.scenario;
    const deliverableName = scenario.deliverableName.trim();
    const settle = scenario.stepSettleMs ?? TC017_STEP_SETTLE_MS;
    const runMarker = `${scenario.syncMarker.trim()} [run-${Date.now()}]`;
    const regenTimeoutMs =
      scenario.regenerateAfterSettingsTimeoutMs ??
      scenario.regenerateTimeoutMs ??
      TC017_REGENERATE_TIMEOUT_MS;

    await test.step('Setup — open sample deliverable', async () => {
      await gotoAppHomeWithSession(this.page);
      await this.openSampleDeliverableFromSearch(
        deliverableName,
        scenario.clientLabel,
        scenario.projectLabel,
      );
    });

    await test.step('1. Brief + Settings — make changes', async () => {
      await this.editsSyncPage.editBriefAndSettings(runMarker, settle);
    });

    await test.step('2. Reset / Regenerate', async () => {
      await this.editsSyncPage.triggerResetAndRegenerate(settle);
      await this.editsSyncPage.waitForFullRegenerationComplete(regenTimeoutMs);
    });

    await test.step('3. Return to prior step/view — verify sync', async () => {
      await this.editsSyncPage.returnToPriorViewsAndVerifySync(runMarker, { settleMs: settle });
      await this.editsSyncPage.finishEditsSyncWorkflow();
    });

    await test.info().attach('edits-sync-result', {
      body: JSON.stringify(
        {
          deliverableName,
          runMarker,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  }
}
