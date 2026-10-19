import type { DeliverableExportTestCaseData } from '@interface/dashboard/deliverable-export.interface';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverableExportPage } from '@page/dashboard/deliverable/deliverable-export.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/**
 * TC-015 — Deliverable export (sample deliverable).
 *
 * Main flow:
 * 1. Trigger Export
 * 2. Observe progress/completion
 * 3. Await download
 * 4. Open exported PPTX
 * 5. Compare to on-screen
 * 6. Close export overlay — test ends
 */
export class DeliverableExportFlowPage {
  private readonly page: Page;
  private readonly clientSearchPage: ClientSearchPage;
  private readonly exportPage: DeliverableExportPage;
  private readonly deliverablePage: DeliverablePage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
    this.exportPage = new DeliverableExportPage(page, testInfo);
    this.deliverablePage = new DeliverablePage(page, testInfo);
  }

  /** Setup — search, open deliverable, Executive Summary on screen (no Brief / Settings). */
  private async prepareDeliverableOnScreenForExport(
    deliverableName: string,
    clientLabel?: string,
    projectLabel?: string,
  ) {
    await this.clientSearchPage.openDeliverableFromSidebar(deliverableName, {
      clientLabel,
      projectLabel,
      skipStageReadyWait: true,
    });
    await this.clientSearchPage.confirmStorylineGenerationLeaveIfPrompted();
    await this.exportPage.waitForSampleDeliverableStorylineOutput();
    await this.exportPage.ensureSampleDeliverableReadyForExport(this.deliverablePage);
    return await this.exportPage.captureOnScreenDeliverableContent(deliverableName, {
      sampleDeliverable: true,
    });
  }

  public async runDeliverableExportWorkflow(bundle: DeliverableExportTestCaseData): Promise<void> {
    const scenario = bundle.scenario;
    const deliverableName = scenario.deliverableName.trim();
    const minBytes = scenario.minExportFileBytes ?? 20_000;
    const filenameFragment =
      scenario.expectedFilenameFragment ?? deliverableName.replace(/\s+/g, '_').toLowerCase();

    await test.step('Setup — open application (cookie session)', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    const onScreen = await test.step(
      `Setup — search "${deliverableName}", Executive Summary on screen`,
      async () => {
        return await this.prepareDeliverableOnScreenForExport(
          deliverableName,
          scenario.clientLabel,
          scenario.projectLabel,
        );
      },
    );

    await this.exportPage.triggerExportForDeliverable();

    const download = await this.exportPage.waitForTc015ExportDownloadAndOverlayDismiss();

    await this.exportPage.openExportedOutput(download, {
      minExportFileBytes: minBytes,
      expectedFilenameFragment: filenameFragment,
    });

    await this.exportPage.compareExportedContentToOnScreen(download, onScreen, {
      contentMarkers: scenario.contentMarkers,
      minExportFileBytes: minBytes,
    });

    await this.exportPage.finishExportWorkflowAndCloseUi(this.deliverablePage);
  }
}
