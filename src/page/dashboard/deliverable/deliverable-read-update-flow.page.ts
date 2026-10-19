import { TC018_STEP_SETTLE_MS } from '@data/dashboard/deliverable/deliverable-read-update.timeouts';
import type { DeliverableReadUpdateTestCaseData } from '@interface/dashboard/deliverable-read-update.interface';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { DeliverableReadUpdatePage } from '@page/dashboard/deliverable/deliverable-read-update.page';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/**
 * TC-018 — Read/update **New deliverable** only (Settings fields):
 * open → view details → update fields → save → reopen → isolation.
 */
export class DeliverableReadUpdateFlowPage {
  private readonly page: Page;
  private readonly clientSearchPage: ClientSearchPage;
  private readonly deliverablePage: DeliverablePage;
  private readonly readUpdatePage: DeliverableReadUpdatePage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
    this.deliverablePage = new DeliverablePage(page, testInfo);
    this.readUpdatePage = new DeliverableReadUpdatePage(page, testInfo);
  }

  private async openDeliverableFromSidebar(
    deliverableName: string,
    clientLabel: string,
    projectLabel: string,
  ): Promise<void> {
    await this.clientSearchPage.openDeliverableFromSidebar(deliverableName, {
      clientLabel,
      projectLabel,
      skipStageReadyWait: true,
    });
    await this.clientSearchPage.waitForDeliverableOpenInMainView(deliverableName, 30_000);
    await this.clientSearchPage.confirmStorylineGenerationLeaveIfPrompted();
    await this.deliverablePage.dismissBlockingDeliverablePanels();
    this.readUpdatePage.setDeliverableContext(deliverableName);
  }

  public async runReadUpdateWorkflow(
    bundle: DeliverableReadUpdateTestCaseData,
    uniqueMarker: string,
  ): Promise<void> {
    const { scenario } = bundle;
    const deliverableName = scenario.deliverableName.trim();
    const clientLabel = scenario.clientLabel;
    const projectLabel = scenario.projectLabel;
    const isolation = scenario.isolationReference;
    const settle = scenario.stepSettleMs ?? TC018_STEP_SETTLE_MS;

    await test.step('Open application (saved session cookies)', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step(`1. Open "${deliverableName}"`, async () => {
      await this.openDeliverableFromSidebar(deliverableName, clientLabel, projectLabel);
    });

    await test.step('2. Verify deliverable details can be viewed', async () => {
      await this.readUpdatePage.assertDeliverableDetailsViewable();
    });

    await test.step('3. Update New deliverable fields and save', async () => {
      await this.readUpdatePage.updateNewDeliverableSettingsFields(uniqueMarker, settle);
    });

    await test.step(
      '4. Reopen Settings in place and verify changes persist (sidebar reload drops unsaved Settings)',
      async () => {
        await this.readUpdatePage.reopenSettingsInPlaceAndAssertMarker(uniqueMarker);
      },
    );

    await test.step(
      `Isolation — "${isolation.deliverableLabel}" must not show update from "${deliverableName}"`,
      async () => {
        await this.clientSearchPage.openDeliverableFromSidebar(isolation.deliverableLabel, {
          clientLabel: isolation.clientLabel,
          projectLabel: isolation.projectLabel,
          confirmStorylineLeave: true,
          skipStageReadyWait: true,
          waitUntilLeftDeliverable: deliverableName,
        });
        await this.clientSearchPage.waitForDeliverableOpenInMainView(
          isolation.deliverableLabel,
          30_000,
        );
        this.readUpdatePage.setDeliverableContext(isolation.deliverableLabel);
        await this.readUpdatePage.assertUpdateMarkerAbsentOnDeliverable(
          uniqueMarker,
          isolation.deliverableLabel,
        );
      },
    );
  }
}
