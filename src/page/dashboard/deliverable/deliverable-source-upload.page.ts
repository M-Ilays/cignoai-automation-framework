import {
  SOURCE_UPLOAD_PROCESSING_TIMEOUT_MS,
  TC013_STEP_SETTLE_MS,
} from '@data/dashboard/deliverable/deliverable-settings-source.timeouts';
import { expect, Locator, Page, test, TestInfo } from '@playwright/test';
import path from 'path';

export interface AttachSourceOptions {
  /** Wait for processing indicators to clear (default true). */
  waitForProcessing?: boolean;
  timeoutMs?: number;
  /** Pause before upload click (default 2s). */
  settleMs?: number;
}

/**
 * Reusable Settings-step source upload (Work details **Upload New File** + **Cited Data Sources**).
 * Used by TC-010, TC-013, and {@link DeliverablePage#uploadSettingsDocument}.
 */
export class DeliverableSourceUploadPage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
  }

  public resolveDocumentPath(relativePath: string): { absolutePath: string; fileName: string } {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    return { absolutePath, fileName: path.basename(absolutePath) };
  }

  private uploadNewFileButton(): Locator {
    return this.page.getByRole('button', { name: /Upload New File/i }).first();
  }

  private citedDataSourcesButton(): Locator {
    return this.page.getByRole('button', { name: /Cited Data Sources/i });
  }

  private workDetailsHeading(): Locator {
    return this.page.getByRole('heading', { name: /^Work details$/i });
  }

  /** Row / chip showing the uploaded file name in Settings (Document / Work details). */
  public sourceFileLabel(fileName: string): Locator {
    return this.page.getByText(fileName, { exact: false });
  }

  /** Document upload block on Settings (Scope & context). */
  private documentUploadRegion(): Locator {
    return this.page
      .getByText(/^Document$/i)
      .first()
      .locator('xpath=ancestor::*[.//button[contains(normalize-space(.), "Upload New File")]][1]');
  }

  /** Uploaded file chip in Settings Document section. */
  private sourceFileInSettingsStage(fileName: string): Locator {
    return this.documentUploadRegion().getByText(fileName, { exact: false });
  }

  private uploadedFilesList(): Locator {
    return this.page.locator('[aria-label="Uploaded files"], [aria-label*="Uploaded files" i]').first();
  }

  private removeSourceFileButton(fileName: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`Remove\\s+${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
    });
  }

  private processingIndicator(): Locator {
    return this.page
      .getByText(/uploading|processing|indexing|parsing|extracting|please wait/i)
      .first();
  }

  private failedUploadIndicator(): Locator {
    return this.page.getByText(/upload failed|failed to (upload|process)|could not process/i).first();
  }

  public async isSourceProcessing(): Promise<boolean> {
    const busy = await this.page
      .locator('[aria-busy="true"], [class*="animate-spin"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (busy) {
      return true;
    }
    return await this.processingIndicator().isVisible().catch(() => false);
  }

  public async isSourceListed(fileName: string): Promise<boolean> {
    return await this.sourceFileLabel(fileName).isVisible().catch(() => false);
  }

  private settingsStageTab(): Locator {
    return this.page
      .getByRole('button', { name: /2\.\s*Settings/i })
      .or(this.page.getByRole('button', { name: /^2$/ }))
      .first();
  }

  /** Click **2. Settings** and wait for Work details + Document upload (configure or existing deliverable). */
  public async openSettingsStage(): Promise<void> {
    await test.step('Open Settings stage', async () => {
      const onSettings =
        (await this.workDetailsHeading().isVisible().catch(() => false)) &&
        (await this.page.getByText(/^Document$/i).first().isVisible().catch(() => false));

      if (!onSettings) {
        const settingsTab = this.settingsStageTab();
        await expect(settingsTab).toBeVisible({ timeout: 15_000 });
        await settingsTab.scrollIntoViewIfNeeded();
        await settingsTab.click();
      }

      await expect(this.workDetailsHeading()).toBeVisible({ timeout: 30_000 });
      await expect(this.page.getByText(/^Document$/i).first()).toBeVisible({ timeout: 30_000 });
    });
  }

  /** Open Settings with **Upload New File** ready (New deliverable configure UI). */
  public async ensureSettingsStageReadyForUpload(): Promise<void> {
    await test.step('Open Settings stage for source upload', async () => {
      await this.openSettingsStage();
      await expect(this.uploadNewFileButton()).toBeVisible({ timeout: 30_000 });
    });
  }

  /**
   * Attach a supported file at Settings (**Upload New File** in Work details).
   */
  public async attachSourceAtSettings(
    relativePath: string,
    options: AttachSourceOptions = {},
  ): Promise<string> {
    const { fileName } = this.resolveDocumentPath(relativePath);
    const waitForProcessing = options.waitForProcessing ?? true;
    const timeoutMs = options.timeoutMs ?? SOURCE_UPLOAD_PROCESSING_TIMEOUT_MS;
    const settleMs = options.settleMs ?? TC013_STEP_SETTLE_MS;

    await test.step(`Attach source file: ${fileName}`, async () => {
      await this.workDetailsHeading().scrollIntoViewIfNeeded();
      await expect(this.uploadNewFileButton()).toBeVisible({ timeout: 15_000 });
      await this.page.waitForTimeout(settleMs);

      const { absolutePath } = this.resolveDocumentPath(relativePath);
      const uploadBtn = this.uploadNewFileButton();
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: 10_000 }),
        uploadBtn.click(),
      ]);
      await fileChooser.setFiles(absolutePath);

      await expect(this.sourceFileLabel(fileName)).toBeVisible({ timeout: 20_000 });

      if (waitForProcessing) {
        await this.waitForSourceUploadProcessing(fileName, timeoutMs);
      }

      await this.page.waitForTimeout(settleMs);
    });

    return fileName;
  }

  /** Wait until upload/processing finishes and the file remains listed. */
  public async waitForSourceUploadProcessing(
    fileName: string,
    timeoutMs = SOURCE_UPLOAD_PROCESSING_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('Verify upload / processing state', async () => {
      let sawProcessing = false;

      await expect
        .poll(
          async () => {
            if (await this.failedUploadIndicator().isVisible().catch(() => false)) {
              return 'failed';
            }
            if (await this.isSourceProcessing()) {
              sawProcessing = true;
              return 'processing';
            }
            if (await this.isSourceListed(fileName)) {
              return sawProcessing ? 'done-after-processing' : 'done';
            }
            return 'pending';
          },
          {
            timeout: timeoutMs,
            intervals: [300, 500, 1000, 2000],
            message: `Source "${fileName}" did not finish uploading/processing`,
          },
        )
        .not.toBe('failed');

      await expect(this.sourceFileLabel(fileName)).toBeVisible({ timeout: 10_000 });

      await this.testInfo.attach('source-upload-state', {
        body: JSON.stringify({ fileName, sawProcessing }, null, 2),
        contentType: 'application/json',
      });
    });
  }

  public async openCitedDataSourcesPanel(): Promise<void> {
    await test.step('Open Cited Data Sources panel', async () => {
      const btn = this.citedDataSourcesButton();
      await expect(btn).toBeVisible({ timeout: 15_000 });
      await btn.click();
    });
  }

  public async assertSourceListedInWorkDetails(fileName: string): Promise<void> {
    await test.step(`Confirm source in Settings / Work details: ${fileName}`, async () => {
      await this.workDetailsHeading().scrollIntoViewIfNeeded();
      await expect(this.sourceFileLabel(fileName)).toBeVisible({ timeout: 15_000 });
    });
  }

  public async assertSourceInCitedDataSources(fileName: string): Promise<void> {
    await test.step(`Confirm source in Cited Data Sources: ${fileName}`, async () => {
      if (!(await this.citedDataSourcesButton().isVisible().catch(() => false))) {
        return;
      }
      await this.openCitedDataSourcesPanel();
      await expect(this.sourceFileLabel(fileName)).toBeVisible({ timeout: 15_000 });
    });
  }

  public async assertSourceAttachedToDeliverable(fileName: string): Promise<void> {
    await test.step(`Confirm source attached to deliverable: ${fileName}`, async () => {
      await this.assertSourceListedInWorkDetails(fileName);
      await this.assertSourceInCitedDataSources(fileName);
    });
  }

  /**
   * After {@link openSettingsStage} on the isolation deliverable: confirm a file uploaded on
   * another deliverable does not appear in Settings (Document list, remove chip, Cited Data Sources).
   */
  public async assertUploadedFileNotOnDeliverableSettings(
    fileName: string,
    options: { sourceDeliverableName: string; isolationDeliverableName: string },
  ): Promise<void> {
    const { sourceDeliverableName, isolationDeliverableName } = options;

    await test.step(
      `Verify "${fileName}" uploaded on "${sourceDeliverableName}" is not on "${isolationDeliverableName}" Settings`,
      async () => {
        await this.workDetailsHeading().scrollIntoViewIfNeeded();

        if (await this.uploadedFilesList().isVisible().catch(() => false)) {
          await expect(this.uploadedFilesList().getByText(fileName, { exact: false })).toHaveCount(0, {
            timeout: 8_000,
          });
        }

        await expect(this.sourceFileInSettingsStage(fileName)).toHaveCount(0, { timeout: 8_000 });
        await expect(this.removeSourceFileButton(fileName)).toHaveCount(0, { timeout: 8_000 });

        if (await this.citedDataSourcesButton().isVisible().catch(() => false)) {
          await this.openCitedDataSourcesPanel();
          await expect(this.sourceFileLabel(fileName)).toHaveCount(0, { timeout: 8_000 });
        }

        await this.testInfo.attach('source-isolation-check', {
          body: JSON.stringify(
            {
              fileName,
              sourceDeliverableName,
              isolationDeliverableName,
              documentListEmpty: true,
            },
            null,
            2,
          ),
          contentType: 'application/json',
        });
      },
    );
  }

  /** @deprecated Use {@link assertUploadedFileNotOnDeliverableSettings}. */
  public async assertSourceAbsentInSettingsDocument(fileName: string): Promise<void> {
    await this.assertUploadedFileNotOnDeliverableSettings(fileName, {
      sourceDeliverableName: 'source deliverable',
      isolationDeliverableName: 'isolation deliverable',
    });
  }

  /** Open Settings, then confirm the file is not listed (Document + Cited Data Sources). */
  public async assertSourceNotInSettings(fileName: string): Promise<void> {
    await this.openSettingsStage();
    await this.assertUploadedFileNotOnDeliverableSettings(fileName, {
      sourceDeliverableName: 'source deliverable',
      isolationDeliverableName: 'isolation deliverable',
    });
  }

  /** @deprecated Prefer {@link assertSourceNotInSettings} — opens Settings before asserting. */
  public async assertSourceNotOnCurrentDeliverable(fileName: string): Promise<void> {
    await this.assertSourceNotInSettings(fileName);
  }

}
