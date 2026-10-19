import {
  TC016_EXPORT_RESOLVE_TIMEOUT_MS,
  TC016_STEP_SETTLE_MS,
} from '@data/dashboard/deliverable/deliverable-export-loader.timeouts';
import type { DeliverableExportLoaderTestCaseData } from '@interface/dashboard/deliverable-export-loader.interface';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverableExportPage } from '@page/dashboard/deliverable/deliverable-export.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { expect, Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';
import fs from 'fs';
import path from 'path';

/**
 * TC-016 — Export loader on **sample deliverable** (already generated).
 *
 * 1. Trigger Export
 * 2. Validate loader / disabled state / promise handling
 * 3. Repeated clicks during processing
 */
export class DeliverableExportLoaderFlowPage {
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

  private async openSampleDeliverableForExport(
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
  }

  public async runExportLoaderWorkflow(bundle: DeliverableExportLoaderTestCaseData): Promise<void> {
    const scenario = bundle.scenario;
    const deliverableName = scenario.deliverableName.trim();
    const repeatedClicks = scenario.repeatedClickCount ?? 5;
    const settle = scenario.stepSettleMs ?? TC016_STEP_SETTLE_MS;
    const resolveTimeoutMs = TC016_EXPORT_RESOLVE_TIMEOUT_MS;

    await test.step('Setup — open application (cookie session)', async () => {
      await gotoAppHomeWithSession(this.page);
      if (settle > 0) {
        await this.page.waitForTimeout(settle);
      }
    });

    await test.step(`Setup — open "${deliverableName}" on Executive Summary`, async () => {
      await this.openSampleDeliverableForExport(
        deliverableName,
        scenario.clientLabel,
        scenario.projectLabel,
      );
    });

    let pptxDownloadCount = 0;
    this.page.on('download', (download) => {
      if (/\.pptx$/i.test(download.suggestedFilename())) {
        pptxDownloadCount += 1;
      }
    });

    const downloadDir = path.join(test.info().outputDir, 'export-loader-downloads');
    fs.mkdirSync(downloadDir, { recursive: true });

    await test.step('1. Trigger Export', async () => {
      await this.exportPage.triggerExportForDeliverable(resolveTimeoutMs);
    });

    await test.step('2–3. Validate loader and repeated clicks during processing', async () => {
      await expect
        .poll(async () => this.exportPage.isExportInProgress(), {
          timeout: 30_000,
          intervals: [100, 200, 500, 1000, 2000],
          message: 'Export in-progress UI should appear after trigger',
        })
        .toBe(true);

      await Promise.all([
        test.step('2. Validate loader, disabled state, and export promise handling', async () => {
          await this.exportPage.assertExportInProgressUi();
          await this.exportPage.assertExportControlBlockedDuringProcessing();
        }),
        test.step('3. Repeated Export clicks during processing', async () => {
          await this.exportPage.clickExportRepeatedlyDuringProcessing(repeatedClicks);
        }),
      ]);
    });

    const exportResult = await test.step('Export resolves — await download and overlay dismiss', async () => {
      const [, saved] = await Promise.all([
        this.exportPage.waitForTc015ExportProgressOverlayDismissed(resolveTimeoutMs),
        this.exportPage.awaitExportedDownload(resolveTimeoutMs),
      ]);
      return saved;
    });

    const filePath = exportResult.filePath;

    await expect
      .poll(
        async () => {
          await this.page.waitForTimeout(400);
          return pptxDownloadCount;
        },
        {
          timeout: 15_000,
          intervals: [400, 600, 1000],
          message: 'Only one PPTX download should be triggered',
        },
      )
      .toBe(1);
    expect(fs.statSync(filePath).size, 'Exported file should be saved').toBeGreaterThan(0);

    await test.info().attach('export-loader-result', {
      body: JSON.stringify(
        { pptxDownloadCount, filePath, filename: exportResult.suggestedFilename },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    await this.exportPage.finishExportWorkflowAndCloseUi(this.deliverablePage);
  }
}
