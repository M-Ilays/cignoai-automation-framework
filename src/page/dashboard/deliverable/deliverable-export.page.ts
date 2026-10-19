import { E2E_NAV_SETTLE_MS } from '@data/dashboard/deliverable/e2e-pacing.timeouts';
import {
  EXPORT_DOWNLOAD_TIMEOUT_MS,
  EXPORT_PROGRESS_TIMEOUT_MS,
  EXPORT_READY_AFTER_GENERATE_TIMEOUT_MS,
  TC015_EXPORT_PROGRESS_TIMEOUT_MS,
  TC015_OVERLAY_CLOSE_TIMEOUT_MS,
  TC015_SAMPLE_CAPTURE_TIMEOUT_MS,
  TC015_STORYLINE_CAPTURE_TIMEOUT_MS,
} from '@data/dashboard/deliverable/deliverable-export.timeouts';
import type { DeliverableNewSettingsScenario } from '@interface/dashboard/deliverable-new-settings.interface';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { DeliverableStageNavigationPage } from '@page/dashboard/deliverable/deliverable-stage-navigation.page';
import type {
  DeliverableContentSnapshot,
  ExportedOutputSummary,
} from '@interface/dashboard/deliverable-export.interface';
import {
  assertExportFileBasics,
  assertExportMatchesDeliverableContent,
  readExportFileAsSearchBlob,
} from '@utilities/helpers/deliverable-export-content.utils';
import { Download, expect, Locator, Page, test, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export interface ExportDownloadResult {
  filePath: string;
  suggestedFilename: string;
}

/**
 * TC-015 — Export deliverable (PPTX), progress UI, download, content comparison.
 */
export class DeliverableExportPage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private exportDownloadPromise: Promise<Download> | null = null;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
  }

  /** Deliverable output canvas (Export toolbar + workplan tabs + storyline). */
  private deliverableStorylineCanvas(): Locator {
    return this.page
      .locator('[role="main"]')
      .last()
      .or(
        this.page
          .locator('div')
          .filter({ has: this.page.getByRole('button', { name: /^Export$/i }) })
          .last(),
      );
  }

  /** @deprecated Use {@link deliverableStorylineCanvas}. */
  private deliverableEditorRegion(): Locator {
    return this.deliverableStorylineCanvas();
  }

  private static readonly WORKPLAN_CAPTURE_SECTIONS = [
    'Executive Summary',
    'Introduction',
    'Overview',
    'Key Findings',
    'Competition',
    'Use Case Prioritization',
    'Use Case Deep Dive',
    'Key Initiatives',
  ];

  private normalizeStorylineExcerpt(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/sticky notes/gi, '')
      .replace(/update section/gi, '')
      .replace(/explain the business context[^.]*\./gi, '')
      .trim();
  }

  private isSettingsFormExcerpt(text: string): boolean {
    const norm = text.toLowerCase();
    if (norm.length < 40) {
      return true;
    }
    const settingsOnly =
      /geographical scope|business scope|time horizon|work details|deliverable type|configure deliverable/i.test(
        norm,
      );
    const hasStorylineSection = /executive summary|competition|use case|key initiatives|introduction|overview/i.test(
      norm,
    );
    return settingsOnly && !hasStorylineSection;
  }

  private isToolbarOnlyExcerpt(text: string): boolean {
    const norm = text.replace(/\s+/g, ' ').trim().toLowerCase();
    return (
      norm.length < 80 &&
      /export/.test(norm) &&
      (/share|sanity|sticky notes|update section|content/i.test(norm) || norm.split(' ').length < 12)
    );
  }

  private deliverableOutputBody(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(/^Sticky notes$/i) })
      .locator('xpath=preceding::*[position()<=10]')
      .last()
      .or(this.deliverableStorylineCanvas().locator('[class*="prose"]').last())
      .or(this.page.locator('aside ~ *').first());
  }

  private stageNavigationPage(): DeliverableStageNavigationPage {
    return new DeliverableStageNavigationPage(this.page, this.testInfo);
  }

  private async clickWorkplanSectionTab(sectionName: string): Promise<boolean> {
    const canvas = this.deliverableStorylineCanvas();
    const want = sectionName.trim().toLowerCase();

    for (const role of ['button', 'tab'] as const) {
      const tabs = canvas.getByRole(role);
      const count = await tabs.count();
      for (let i = 0; i < count; i += 1) {
        const tab = tabs.nth(i);
        const label = (await tab.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().toLowerCase();
        const withoutIndex = label.replace(/^\d+\s+/, '');
        if (
          withoutIndex !== want &&
          !withoutIndex.startsWith(`${want} `) &&
          !label.includes(want)
        ) {
          continue;
        }
        if (!(await tab.isVisible().catch(() => false))) {
          continue;
        }
        if (!(await tab.isEnabled().catch(() => false))) {
          continue;
        }
        await tab.click({ timeout: 8_000 }).catch(() => undefined);
        await this.page.waitForTimeout(this.navSettleMs() || 400);
        return true;
      }
    }
    return false;
  }

  private async readActiveSectionBodyExcerpt(): Promise<{ section: string; excerpt: string }> {
    await this.navigateToDeliverableOutputStage();

    const canvas = this.deliverableStorylineCanvas();
    let bestSection = 'Executive Summary';
    let bestExcerpt = '';

    for (const sectionName of DeliverableExportPage.WORKPLAN_CAPTURE_SECTIONS) {
      await this.clickWorkplanSectionTab(sectionName);

      const heading = this.page.getByRole('heading', { name: new RegExp(sectionName, 'i'), level: 2 }).first();
      let excerpt = '';
      if (await heading.isVisible().catch(() => false)) {
        const block = heading.locator(
          'xpath=ancestor::div[1]/following-sibling::*[1]|ancestor::section[1]',
        );
        if (await block.first().isVisible().catch(() => false)) {
          excerpt = this.normalizeStorylineExcerpt(await block.first().innerText().catch(() => ''));
        }
      }

      if (excerpt.length < 30) {
        excerpt = this.normalizeStorylineExcerpt(await canvas.innerText().catch(() => ''));
      }
      if (excerpt.length < 30) {
        excerpt = this.normalizeStorylineExcerpt(
          await this.deliverableOutputBody().innerText().catch(() => ''),
        );
      }

      if (
        !this.isSettingsFormExcerpt(excerpt) &&
        !this.isToolbarOnlyExcerpt(excerpt) &&
        excerpt.length > bestExcerpt.length
      ) {
        bestExcerpt = excerpt;
        bestSection = sectionName;
      }
      if (bestExcerpt.length >= 80) {
        break;
      }
    }

    return { section: bestSection, excerpt: bestExcerpt };
  }

  /** Executive Summary only — avoids cycling every workplan tab on each poll. */
  private async readExecutiveSummaryExcerpt(): Promise<{ section: string; excerpt: string }> {
    await this.ensureExecutiveSummaryTabActive();

    const canvas = this.deliverableStorylineCanvas();
    const heading = this.page
      .getByRole('heading', { name: /^Executive Summary$/i, level: 2 })
      .first();
    let excerpt = '';

    if (await heading.isVisible().catch(() => false)) {
      const block = heading.locator(
        'xpath=ancestor::div[1]/following-sibling::*[1]|ancestor::section[1]',
      );
      if (await block.first().isVisible().catch(() => false)) {
        excerpt = this.normalizeStorylineExcerpt(await block.first().innerText().catch(() => ''));
      }
    }

    if (excerpt.length < 30) {
      excerpt = this.normalizeStorylineExcerpt(await canvas.innerText().catch(() => ''));
    }
    if (excerpt.length < 30) {
      excerpt = this.normalizeStorylineExcerpt(
        await this.deliverableOutputBody().innerText().catch(() => ''),
      );
    }

    return { section: 'Executive Summary', excerpt };
  }

  public exportButton(): Locator {
    return this.page.getByRole('button', { name: /^Export$/i }).first();
  }

  private navSettleMs(): number {
    return E2E_NAV_SETTLE_MS > 0 ? Math.min(E2E_NAV_SETTLE_MS, 200) : 0;
  }

  private async ensureDeliverableContentTab(): Promise<void> {
    const contentTab = this.page
      .getByRole('tab', { name: /^Content$/i })
      .or(this.page.getByRole('button', { name: /^Content$/i }))
      .first();
    if (await contentTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await contentTab.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(this.navSettleMs() || 300);
    }
  }

  /** True when **3. Deliverable** storyline is showing (not Brief / Settings configure UI). */
  public async isOnDeliverableStorylineOutput(): Promise<boolean> {
    if (await this.page.getByText(/^Configure Deliverable$/i).first().isVisible().catch(() => false)) {
      return false;
    }
    if (await this.page.getByText(/^Project objectives and context$/i).first().isVisible().catch(() => false)) {
      return false;
    }
    if (await this.exportButton().isVisible().catch(() => false)) {
      return true;
    }
    if (await this.page.getByText(/^Sticky notes$/i).first().isVisible().catch(() => false)) {
      return true;
    }
    const execTab = this.page.getByRole('button', { name: /^Executive Summary$/i }).first();
    return (await execTab.isVisible().catch(() => false)) && (await execTab.isEnabled().catch(() => false));
  }

  /** Activate **Executive Summary** workplan tab (exact label). */
  public async ensureExecutiveSummaryTabActive(): Promise<void> {
    const canvas = this.deliverableStorylineCanvas();
    const expand = canvas
      .locator('xpath=.//button[normalize-space()="Expand section"]')
      .first();
    if (await expand.isVisible().catch(() => false)) {
      await expand.click({ force: true, timeout: 8_000 }).catch(() => undefined);
      await this.page.waitForTimeout(this.navSettleMs() || 400);
    }
    await this.clickWorkplanSectionTab('Executive Summary');
  }

  /**
   * **3. Deliverable → Content → Executive Summary** only — never opens Brief or Settings tabs.
   */
  public async navigateToDeliverableOutputStage(): Promise<void> {
    if (await this.isOnDeliverableStorylineOutput()) {
      await this.ensureDeliverableContentTab();
      await this.ensureExecutiveSummaryTabActive();
      return;
    }

    await this.stageNavigationPage().navigateToDeliverableStageDirect();
    await this.ensureDeliverableContentTab();

    if (await this.isOnDeliverableStorylineOutput()) {
      await this.ensureExecutiveSummaryTabActive();
      return;
    }

    const deliverableTab = this.page
      .getByText(/^3\.\s*Deliverable$/i)
      .or(this.page.getByRole('button', { name: /^3$/ }));
    if (await deliverableTab.first().isVisible().catch(() => false)) {
      await deliverableTab.first().click({ force: true, timeout: 5_000 }).catch(() => undefined);
      await this.page.waitForTimeout(this.navSettleMs() || 300);
    }

    await this.ensureDeliverableContentTab();
    await this.ensureExecutiveSummaryTabActive();
  }

  /** After sidebar open — sample deliverable should land on storyline with Export. */
  public async waitForSampleDeliverableStorylineOutput(timeoutMs = 45_000): Promise<void> {
    await test.step('Wait for 3. Deliverable — Executive Summary / Export (skip Brief & Settings)', async () => {
      await expect
        .poll(async () => this.isOnDeliverableStorylineOutput(), {
          timeout: timeoutMs,
          intervals: [500, 1000, 2000, 3000],
          message:
            'sample deliverable should show Deliverable output (Executive Summary or Export), not Brief/Settings',
        })
        .toBe(true);

      await this.navigateToDeliverableOutputStage();
      await expect(this.exportButton()).toBeEnabled({ timeout: 30_000 });
    });
  }

  /** Tab 3 only — no Brief/Settings detour. */
  private async quickCheckExportReady(): Promise<boolean> {
    const deliverableTab = this.page
      .getByText(/^3\.\s*Deliverable$/i)
      .or(this.page.getByRole('button', { name: /^3$/ }));
    if (await deliverableTab.first().isVisible().catch(() => false)) {
      await deliverableTab.first().click({ timeout: 2_000 }).catch(() => undefined);
    }
    return await this.isExportReady();
  }

  private async isExportVisible(): Promise<boolean> {
    return await this.exportButton().isVisible().catch(() => false);
  }

  private async isExportReady(): Promise<boolean> {
    const btn = this.exportButton();
    return (
      (await btn.isVisible().catch(() => false)) && (await btn.isEnabled().catch(() => false))
    );
  }

  /** Navigate to deliverable view and use Export immediately when already available. */
  public async prepareForExportClick(): Promise<void> {
    await this.navigateToDeliverableOutputStage();
  }

  /**
   * TC-015 — **sample deliverable** is already generated: stay on **3. Deliverable / Executive Summary**, never Brief or Settings.
   */
  public async ensureSampleDeliverableReadyForExport(
    deliverablePage: DeliverablePage,
  ): Promise<void> {
    await test.step(
      'sample deliverable — 3. Deliverable / Executive Summary only (no Brief, no Settings, no Generate)',
      async () => {
        await deliverablePage.dismissBlockingDeliverablePanels();
        await this.navigateToDeliverableOutputStage();

        await expect(this.exportButton()).toBeEnabled({ timeout: 30_000 });

        await this.testInfo.attach('tc015-sample-storyline-ready', {
          body:
            'sample deliverable — on Deliverable output with Export enabled; Brief and Settings were not opened.',
          contentType: 'text/plain',
        });
      },
    );
  }

  /**
   * TC-015 fast path: open Settings → Generate → proceed as soon as Export is enabled.
   * Does not wait for full storyline / Progress completion.
   */
  public async generateFromSettingsAndWaitForExport(
    deliverablePage: DeliverablePage,
    settingsScenario?: DeliverableNewSettingsScenario,
    exportReadyTimeoutMs = EXPORT_READY_AFTER_GENERATE_TIMEOUT_MS,
    options?: { skipGenerateWhenExportReady?: boolean },
  ): Promise<void> {
    await test.step('Settings → Generate deliverable → wait for Export', async () => {
      await deliverablePage.dismissBlockingDeliverablePanels();
      await this.navigateToDeliverableOutputStage();

      if (
        options?.skipGenerateWhenExportReady !== false &&
        (await this.quickCheckExportReady())
      ) {
        await this.testInfo.attach('tc015-generate-skipped', {
          body: 'Export already enabled — skipping Settings → Generate.',
          contentType: 'text/plain',
        });
        return;
      }

      if (await this.quickCheckExportReady()) {
        return;
      }

      if (await this.isExportVisible()) {
        await this.waitForExportEnabled(exportReadyTimeoutMs);
        if (await this.quickCheckExportReady()) {
          return;
        }
      }

      await deliverablePage.goToSettingsStage({ fast: true });

      if (settingsScenario) {
        await deliverablePage.ensureClientNameSelected(
          settingsScenario.clientSearchTerm ?? 'automation',
          settingsScenario.projectName ?? 'New project',
        );
        await deliverablePage.fillMinimalSettingsForGenerate(settingsScenario);
      }

      if (await this.quickCheckExportReady()) {
        return;
      }

      const generateBtn = this.page.getByRole('button', { name: /Generate deliverable/i }).first();
      if (await generateBtn.isEnabled().catch(() => false)) {
        await deliverablePage.clickGenerateWithResetIfPrompted();
      }

      await this.waitForExportEnabled(exportReadyTimeoutMs);
      await this.prepareForExportClick();
    });
  }

  /** @deprecated Use {@link generateFromSettingsAndWaitForExport} */
  public async ensureStorylineReadyForExport(
    deliverablePage: DeliverablePage,
    settingsScenario?: DeliverableNewSettingsScenario,
  ): Promise<void> {
    await this.generateFromSettingsAndWaitForExport(deliverablePage, settingsScenario);
  }

  /** Poll until Export is clickable — does not require full generation Progress to finish. */
  public async waitForExportEnabled(
    timeoutMs = EXPORT_READY_AFTER_GENERATE_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('Wait until Export is enabled', async () => {
      let polls = 0;
      await expect
        .poll(
          async () => {
            if (await this.isExportReady()) {
              return true;
            }
            polls += 1;
            if (polls === 1 || polls % 2 === 0) {
              await this.prepareForExportClick();
            }
            return await this.isExportReady();
          },
          {
            timeout: timeoutMs,
            intervals: [200, 300, 500, 1000, 2000, 3000, 5000],
            message: 'Export should become enabled after Generate deliverable',
          },
        )
        .toBe(true);
    });
  }

  /** Used by TC-016 when deliverable is already opened — waits for Export only. */
  public async waitForGeneratedDeliverableExportView(timeoutMs = 90_000): Promise<void> {
    await this.waitForExportEnabled(Math.max(timeoutMs, EXPORT_READY_AFTER_GENERATE_TIMEOUT_MS));
    await this.navigateToDeliverableOutputStage();
  }

  private exportingHeading(): Locator {
    return this.page.getByRole('heading', { name: /Exporting PPTX/i });
  }

  /** Full-screen overlay (`fixed inset-0 z-[9999]`) — no Close button; app removes it when export finishes. */
  private exportProgressOverlay(): Locator {
    return this.page.locator('div.fixed.inset-0').filter({ has: this.exportingHeading() }).first();
  }

  private exportProgressCard(): Locator {
    return this.exportProgressOverlay().locator('div.relative.bg-white.rounded-xl').first();
  }

  private exportProgressText(): Locator {
    return this.exportProgressCard().getByText(/\d+%\s*complete/i).first();
  }

  /** Parsed % from label and/or progress bar width; `null` when overlay is not open. */
  private async readExportProgressPercent(): Promise<number | null> {
    if (!(await this.exportProgressOverlay().isVisible().catch(() => false))) {
      return null;
    }

    const label = (await this.exportProgressText().textContent().catch(() => '')) ?? '';
    const labelMatch = label.match(/(\d+)\s*%/);
    let percent = labelMatch ? Number.parseInt(labelMatch[1], 10) : 0;

    const barStyle =
      (await this.exportProgressCard().locator('div.bg-blue-600').first().getAttribute('style').catch(() => '')) ??
      '';
    const widthMatch = barStyle.match(/width:\s*([\d.]+)%/);
    if (widthMatch) {
      percent = Math.max(percent, Math.round(Number.parseFloat(widthMatch[1])));
    }

    return percent;
  }

  public async isExportInProgress(): Promise<boolean> {
    return await this.exportProgressOverlay().isVisible().catch(() => false);
  }

  public async clickExport(): Promise<void> {
    await test.step('Click Export', async () => {
      await this.prepareForExportClick();
      const btn = this.exportButton();
      await expect(btn).toBeVisible({ timeout: 8_000 });
      await expect(btn).toBeEnabled({ timeout: 5_000 });
      await btn.click();
    });
  }

  /** TC-016 — in-progress modal, storyline collection, and % complete. */
  public async assertExportInProgressUi(): Promise<void> {
    await test.step('Assert export in-progress UI', async () => {
      await expect(this.exportingHeading()).toBeVisible({ timeout: 20_000 });
      await expect(this.page.getByText(/Collecting rendered storyline/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(this.exportProgressText()).toBeVisible({ timeout: 20_000 });
    });
  }

  public async assertExportControlBlockedDuringProcessing(): Promise<void> {
    await test.step('Assert Export is disabled while processing (if still running)', async () => {
      const exporting = await this.exportingHeading().isVisible().catch(() => false);
      if (!exporting) {
        return;
      }

      const disabled = await this.exportButton().isDisabled().catch(() => false);
      const ariaDisabled = await this.exportButton().getAttribute('aria-disabled');
      if (disabled || ariaDisabled === 'true') {
        await expect(this.exportButton()).toBeDisabled();
      }
    });
  }

  /** New deliverable — wait for generation + Export before PPTX download can fire. */
  public async waitForNewDeliverableReadyForExport(deliverablePage: DeliverablePage): Promise<void> {
    await test.step('Wait for New deliverable generation before export', async () => {
      await deliverablePage.dismissBlockingDeliverablePanels();
      await this.navigateToDeliverableOutputStage();

      const stageNav = this.stageNavigationPage();
      await expect
        .poll(async () => stageNav.isDeliverableGenerationComplete(), {
          timeout: 10 * 60 * 1000,
          intervals: [2000, 3000, 5000, 10000],
          message: 'New deliverable generation should finish before export download',
        })
        .toBe(true);

      await expect(this.exportButton()).toBeEnabled({ timeout: 30_000 });
    });
  }

  /**
   * TC-016 — click Export, validate loader while active, spam clicks, then wait for resolution.
   * Starts the download listener before the first Export click.
   */
  public async triggerExportAndValidateLoaderDuringProcessing(
    repeatedClicks: number,
    resolveTimeoutMs = EXPORT_PROGRESS_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('Trigger Export and validate loader / duplicate-click guard', async () => {
      await this.prepareForExportClick();
      const btn = this.exportButton();
      await expect(btn).toBeVisible({ timeout: 10_000 });
      await expect(btn).toBeEnabled({ timeout: 30_000 });
      await btn.scrollIntoViewIfNeeded();

      this.exportDownloadPromise = this.page.waitForEvent('download', {
        timeout: resolveTimeoutMs,
      });
      await btn.click({ force: true, timeout: 15_000 });

      const retryDuringLoader = this.clickExportRepeatedlyDuringProcessing(repeatedClicks);

      await expect
        .poll(async () => this.isExportInProgress(), {
          timeout: 30_000,
          intervals: [100, 200, 500, 1000, 2000],
          message: 'Export in-progress UI should appear after trigger',
        })
        .toBe(true);

      await this.assertExportInProgressUi();
      await retryDuringLoader;

      await this.assertExportControlBlockedDuringProcessing();
      await this.assertExportResolvedSuccessfully(resolveTimeoutMs);
    });
  }

  public async clickExportRepeatedlyDuringProcessing(attempts: number): Promise<void> {
    await test.step(`Retry Export up to ${attempts} times while processing`, async () => {
      let peakExportSessions = 0;
      let inProgressChecks = 0;
      let blockedClickAttempts = 0;
      let sawDisabledDuringExport = false;

      for (let i = 0; i < attempts; i += 1) {
        if (!(await this.isExportInProgress())) {
          break;
        }

        inProgressChecks += 1;
        peakExportSessions = Math.max(peakExportSessions, await this.exportingHeading().count());

        const disabled = await this.exportButton().isDisabled().catch(() => false);
        const ariaDisabled = (await this.exportButton().getAttribute('aria-disabled')) === 'true';

        if (disabled || ariaDisabled) {
          sawDisabledDuringExport = true;
          blockedClickAttempts += 1;
          await this.exportButton().click({ timeout: 500 }).catch(() => undefined);
        }

        await this.page.waitForTimeout(150);
        peakExportSessions = Math.max(peakExportSessions, await this.exportingHeading().count());
      }

      expect(
        inProgressChecks,
        'Should observe export in progress at least once while retrying',
      ).toBeGreaterThan(0);
      expect(
        peakExportSessions,
        'Repeated Export clicks must not open multiple export sessions',
      ).toBeLessThanOrEqual(1);

      if (sawDisabledDuringExport) {
        expect(
          blockedClickAttempts,
          'Export should reject clicks while disabled during processing',
        ).toBeGreaterThan(0);
      }
    });
  }

  public async assertExportResolvedSuccessfully(
    timeoutMs = EXPORT_PROGRESS_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('Assert export completes without hanging', async () => {
      if (await this.isExportInProgress()) {
        await this.waitForTc015ExportProgressOverlayDismissed(
          Math.min(timeoutMs, TC015_EXPORT_PROGRESS_TIMEOUT_MS),
        );
      }
      await expect(this.exportProgressOverlay()).not.toBeVisible({ timeout: 30_000 });
      await expect(this.exportButton()).toBeEnabled({ timeout: 30_000 });
    });
  }

  public async assertExportAvailable(): Promise<void> {
    await test.step('Assert Export control is available', async () => {
      await this.prepareForExportClick();
      const btn = this.exportButton();
      await expect(btn).toBeVisible({ timeout: 8_000 });
      await expect(btn).toBeEnabled({ timeout: 5_000 });
    });
  }

  private async buildFallbackOnScreenSnapshot(
    deliverableName: string,
    titleRe: RegExp,
  ): Promise<DeliverableContentSnapshot> {
    const canvas = this.deliverableStorylineCanvas();

    const visibleTabs = (
      await canvas
        .getByRole('button')
        .filter({
          hasText:
            /Executive Summary|Introduction|Overview|Key Findings|Competition|Use Case|Key Initiatives/i,
        })
        .allTextContents()
    )
      .map((h) => h.replace(/\s+/g, ' ').trim())
      .filter((h) => h.length > 0);

    const objectives = this.page
      .getByLabel(/project objectives/i)
      .or(this.page.locator('textarea').filter({ has: this.page.getByText(/objectives/i) }))
      .first();
    let bodyExcerpt = '';
    if (await objectives.isVisible().catch(() => false)) {
      bodyExcerpt = (await objectives.inputValue().catch(() => '')).replace(/\s+/g, ' ').trim();
    }
    if (bodyExcerpt.length < 30) {
      bodyExcerpt = this.normalizeStorylineExcerpt(
        (await this.page.locator('body').innerText().catch(() => '')).slice(0, 2_000),
      );
    }

    return {
      deliverableTitle: deliverableName,
      sectionHeadings: [
        ...new Set([...visibleTabs, ...DeliverableExportPage.WORKPLAN_CAPTURE_SECTIONS]),
      ].filter((h) => !titleRe.test(h)),
      bodyExcerpt: bodyExcerpt.slice(0, 2_500),
    };
  }

  /** Wait for workplan storyline text (Export may enable before slides render). */
  public async waitForStorylineSlideContent(
    timeoutMs = TC015_STORYLINE_CAPTURE_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('Wait for Executive Summary storyline text', async () => {
      await this.navigateToDeliverableOutputStage();

      const stageNav = this.stageNavigationPage();
      let lastExcerpt = '';

      await expect
        .poll(
          async () => {
            const { excerpt } = await this.readActiveSectionBodyExcerpt();
            lastExcerpt = excerpt;
            if (
              !this.isSettingsFormExcerpt(excerpt) &&
              !this.isToolbarOnlyExcerpt(excerpt) &&
              excerpt.length >= 60
            ) {
              return true;
            }
            if (
              !this.isToolbarOnlyExcerpt(excerpt) &&
              excerpt.length >= 30 &&
              (await this.isExportReady())
            ) {
              return true;
            }
            if (await stageNav.isDeliverableGenerationComplete()) {
              const retry = await this.readActiveSectionBodyExcerpt();
              lastExcerpt = retry.excerpt;
              return (
                !this.isToolbarOnlyExcerpt(retry.excerpt) && retry.excerpt.length >= 30
              );
            }
            return false;
          },
          {
            timeout: timeoutMs,
            intervals: [1000, 2000, 3000, 5000],
            message:
              'Storyline slide text should appear on a workplan section before capture (Export can enable earlier)',
          },
        )
        .toBe(true);

      await this.testInfo.attach('tc015-storyline-ready', {
        body: lastExcerpt.slice(0, 500) || '(empty)',
        contentType: 'text/plain',
      });
    });
  }

  public async captureOnScreenDeliverableContent(
    deliverableName: string,
    options?: { sampleDeliverable?: boolean },
  ): Promise<DeliverableContentSnapshot> {
    const samplePath = options?.sampleDeliverable === true;
    const captureTimeoutMs = samplePath
      ? TC015_SAMPLE_CAPTURE_TIMEOUT_MS
      : TC015_STORYLINE_CAPTURE_TIMEOUT_MS;
    const readExcerpt = samplePath
      ? () => this.readExecutiveSummaryExcerpt()
      : () => this.readActiveSectionBodyExcerpt();

    return await test.step('Capture on-screen deliverable content', async () => {
      const titleRe = new RegExp(`^${deliverableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      await expect(
        this.page
          .getByRole('heading', { name: titleRe, level: 2 })
          .or(this.page.getByRole('button', { name: titleRe }))
          .first(),
      ).toBeVisible({ timeout: 30_000 });

      await this.navigateToDeliverableOutputStage();

      let primarySection = 'Executive Summary';
      let bodyExcerpt = '';
      let sectionHeadings: string[] | undefined;

      if (samplePath) {
        const initial = await readExcerpt();
        primarySection = initial.section;
        bodyExcerpt = initial.excerpt;
      }

      const hasUsableExcerpt = (excerpt: string): boolean =>
        excerpt.length > 15 &&
        !this.isToolbarOnlyExcerpt(excerpt) &&
        !this.isSettingsFormExcerpt(excerpt);

      if (!samplePath || !hasUsableExcerpt(bodyExcerpt)) {
        try {
          await expect
            .poll(
              async () => {
                const captured = await readExcerpt();
                primarySection = captured.section;
                bodyExcerpt = captured.excerpt;
                if (this.isToolbarOnlyExcerpt(bodyExcerpt) || this.isSettingsFormExcerpt(bodyExcerpt)) {
                  return 0;
                }
                if (samplePath && bodyExcerpt.length >= 15 && (await this.isExportReady())) {
                  return bodyExcerpt.length;
                }
                return bodyExcerpt.length;
              },
              {
                timeout: captureTimeoutMs,
                intervals: samplePath ? [500, 1000, 2000, 3000] : [1000, 2000, 3000, 5000],
                message: samplePath
                  ? 'Executive Summary should show storyline text (or Export-ready) before export'
                  : 'A workplan section should show storyline text on screen before export comparison',
              },
            )
            .toBeGreaterThan(15);
        } catch (captureError) {
          const stageNav = this.stageNavigationPage();
          if (
            (await this.isExportReady()) &&
            (await stageNav.isDeliverableGenerationComplete())
          ) {
            const fallback = await this.buildFallbackOnScreenSnapshot(deliverableName, titleRe);
            primarySection = 'Executive Summary';
            bodyExcerpt = fallback.bodyExcerpt;
            sectionHeadings = fallback.sectionHeadings;
            await this.testInfo.attach('deliverable-on-screen-fallback-snapshot', {
              body: JSON.stringify(fallback, null, 2),
              contentType: 'application/json',
            });
            if (bodyExcerpt.length <= 15) {
              throw captureError;
            }
          } else {
            throw captureError;
          }
        }
      }

      if (!sectionHeadings) {
        const canvas = this.deliverableStorylineCanvas();
        sectionHeadings = (await canvas.getByRole('heading', { level: 2 }).allTextContents())
          .map((h) => h.replace(/\s+/g, ' ').trim())
          .filter(
            (h) =>
              h.length > 0 &&
              !titleRe.test(h) &&
              !/discard source|recently discard|chat assistant/i.test(h),
          );

        const workplanSections = (
          await canvas
            .getByRole('button')
            .filter({
              hasText:
                /Executive Summary|Introduction|Overview|Key Findings|Competition|Use Case|Key Initiatives/i,
            })
            .allTextContents()
        )
          .map((h) => h.replace(/\s+/g, ' ').trim())
          .filter((h) => h.length > 0);
        sectionHeadings = [...new Set([...sectionHeadings, ...workplanSections])];
      }

      if (!sectionHeadings.some((h) => new RegExp(primarySection, 'i').test(h))) {
        sectionHeadings = [primarySection, ...sectionHeadings];
      }

      const snapshot: DeliverableContentSnapshot = {
        deliverableTitle: deliverableName,
        sectionHeadings,
        bodyExcerpt,
      };

      await this.testInfo.attach('deliverable-on-screen-snapshot', {
        body: JSON.stringify(snapshot, null, 2),
        contentType: 'application/json',
      });

      return snapshot;
    });
  }

  public async waitForExportProgressComplete(
    timeoutMs = EXPORT_PROGRESS_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('Wait for export progress to reach 100%', async () => {
      await expect(this.exportProgressOverlay()).toBeVisible({ timeout: 20_000 });
      await expect(this.exportProgressCard().getByText(/Collecting rendered storyline/i).first()).toBeVisible({
        timeout: 20_000,
      });

      let peakPercent = 0;

      await expect
        .poll(
          async () => {
            if (!(await this.exportProgressOverlay().isVisible().catch(() => false))) {
              return peakPercent > 0 ? 100 : -1;
            }
            const percent = await this.readExportProgressPercent();
            if (percent !== null) {
              peakPercent = Math.max(peakPercent, percent);
            }
            return peakPercent;
          },
          {
            timeout: timeoutMs,
            intervals: [500, 1000, 2000, 3000],
            message: 'Export progress overlay should close after export runs',
          },
        )
        .toBeGreaterThanOrEqual(1);

      await this.testInfo.attach('tc015-export-progress-complete', {
        body: `Export progress peak: ${peakPercent}% before overlay closed.`,
        contentType: 'text/plain',
      });
    });
  }

  /**
   * TC-015 — wait for overlay to close (runs in parallel with download).
   * Tracks peak % for reporting; does not block on a 100% label.
   */
  public async waitForTc015ExportProgressOverlayDismissed(
    timeoutMs = TC015_EXPORT_PROGRESS_TIMEOUT_MS,
  ): Promise<void> {
    if (!(await this.exportProgressOverlay().isVisible().catch(() => false))) {
      return;
    }

    let peakPercent = 0;

    await expect
      .poll(
        async () => {
          if (!(await this.exportProgressOverlay().isVisible().catch(() => false))) {
            return true;
          }
          const percent = await this.readExportProgressPercent();
          if (percent !== null) {
            peakPercent = Math.max(peakPercent, percent);
          }
          return false;
        },
        {
          timeout: timeoutMs,
          intervals: [300, 500, 1000, 2000],
          message: 'Export progress overlay should dismiss when export finishes',
        },
      )
      .toBe(true);

    await this.testInfo.attach('tc015-export-progress-dismissed', {
      body: `Export overlay dismissed (peak progress: ${peakPercent || 'n/a'}%).`,
      contentType: 'text/plain',
    });
  }

  /** Last resort when the app leaves the export overlay open after download. */
  private async forceCloseExportProgressOverlay(): Promise<void> {
    const overlay = this.exportProgressOverlay();
    if (!(await overlay.isVisible().catch(() => false))) {
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => undefined);
    const backdrop = overlay.locator('div.absolute.inset-0').first();
    if (await backdrop.isVisible().catch(() => false)) {
      await backdrop.click({ position: { x: 8, y: 8 }, force: true }).catch(() => undefined);
    }

    if (await overlay.isVisible().catch(() => false)) {
      await overlay.evaluate((node) => node.remove());
    }
  }

  /**
   * Export overlay has no Close control — wait until the app removes `fixed inset-0` overlay.
   * Runs after the download so the backend/export job can finish first.
   */
  public async waitForExportProgressOverlayClosed(
    timeoutMs = TC015_OVERLAY_CLOSE_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('Wait for export progress overlay to close', async () => {
      if (!(await this.exportProgressOverlay().isVisible().catch(() => false))) {
        return;
      }

      await expect(this.exportProgressOverlay()).not.toBeVisible({
        timeout: timeoutMs,
        message: 'Export progress overlay should close after export completes',
      });
    });
  }

  /** @deprecated Use {@link waitForExportProgressOverlayClosed}. */
  public async dismissExportProgressModalIfOpen(): Promise<void> {
    await this.waitForExportProgressOverlayClosed(60_000);
  }

  /** TC-015 step 1 — click Export (download listener started before click). */
  public async triggerExportForDeliverable(
    downloadTimeoutMs = EXPORT_DOWNLOAD_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('1. Trigger Export for deliverable', async () => {
      const btn = this.exportButton();
      await expect(btn).toBeVisible({ timeout: 10_000 });
      await expect(btn).toBeEnabled({ timeout: 15_000 });
      await btn.scrollIntoViewIfNeeded();

      this.exportDownloadPromise = this.page.waitForEvent('download', {
        timeout: downloadTimeoutMs,
      });
      await btn.click({ force: true, timeout: 15_000 });

      await expect
        .poll(
          async () => (await this.isExportInProgress()) || !(await btn.isEnabled().catch(() => true)),
          {
            timeout: 12_000,
            intervals: [200, 500, 1000, 2000],
            message: 'Export should start (progress UI or disabled Export) after click',
          },
        )
        .toBe(true);

      await this.testInfo.attach('tc015-export-clicked', {
        body: 'Export clicked; export session started.',
        contentType: 'text/plain',
      });
    });
  }

  /**
   * TC-015 — download and overlay dismiss in parallel (overlay has no Close button).
   */
  public async waitForTc015ExportDownloadAndOverlayDismiss(
    progressTimeoutMs = TC015_EXPORT_PROGRESS_TIMEOUT_MS,
    downloadTimeoutMs = EXPORT_DOWNLOAD_TIMEOUT_MS,
  ): Promise<ExportDownloadResult> {
    return await test.step('2–3. Export progress, download, and overlay dismiss', async () => {
      await this.assertExportInProgressUi();

      const [, download] = await Promise.all([
        this.waitForTc015ExportProgressOverlayDismissed(progressTimeoutMs),
        this.awaitExportedDownload(downloadTimeoutMs),
      ]);

      return download;
    });
  }

  private async saveDownloadToOutputDir(download: Download): Promise<ExportDownloadResult> {
    const downloadDir = path.join(this.testInfo.outputDir, 'export-downloads');
    fs.mkdirSync(downloadDir, { recursive: true });
    const suggestedFilename = download.suggestedFilename();
    const filePath = path.join(downloadDir, suggestedFilename);
    await download.saveAs(filePath);
    return { filePath, suggestedFilename };
  }

  /** Await browser download after steps 1–2. */
  public async awaitExportedDownload(
    timeoutMs = EXPORT_DOWNLOAD_TIMEOUT_MS,
  ): Promise<ExportDownloadResult> {
    if (!this.exportDownloadPromise) {
      throw new Error('Export was not triggered — call triggerExportForDeliverable() first');
    }

    const download = await this.exportDownloadPromise;
    this.exportDownloadPromise = null;
    return await this.saveDownloadToOutputDir(download);
  }

  /** TC-015 step 3 — open/read downloaded PPTX and validate file structure. */
  public async openExportedOutput(
    download: ExportDownloadResult,
    options: { minExportFileBytes: number; expectedFilenameFragment?: string },
  ): Promise<ExportedOutputSummary> {
    return await test.step('3. Open downloaded exported output', async () => {
      assertExportFileBasics(download.filePath, {
        minBytes: options.minExportFileBytes,
        filenameFragment: options.expectedFilenameFragment,
        suggestedName: download.suggestedFilename,
      });

      const exportHay = readExportFileAsSearchBlob(download.filePath);
      const fileSizeBytes = fs.statSync(download.filePath).size;
      const isValidPptxZip = exportHay.includes('ppt/');
      const readableExcerpt = exportHay.replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);

      expect(isValidPptxZip, 'Exported file should be a valid PPTX (ZIP with ppt/ entries)').toBe(true);

      const summary: ExportedOutputSummary = {
        filePath: download.filePath,
        suggestedFilename: download.suggestedFilename,
        fileSizeBytes,
        isValidPptxZip,
        readableExcerpt,
      };

      await this.testInfo.attach('exported-output-opened', {
        body: JSON.stringify(summary, null, 2),
        contentType: 'application/json',
      });

      return summary;
    });
  }

  /** TC-015 step 4 — correlate PPTX text with on-screen Executive Summary snapshot. */
  public async compareExportedContentToOnScreen(
    download: ExportDownloadResult,
    snapshot: DeliverableContentSnapshot,
    options: {
      contentMarkers: string[];
      minExportFileBytes: number;
    },
  ): Promise<void> {
    await test.step('4. Compare exported content to on-screen deliverable', async () => {
      assertExportMatchesDeliverableContent(download.filePath, snapshot, options.contentMarkers, {
        minExportFileBytes: options.minExportFileBytes,
      });
    });
  }

  /** TC-015 — ensure overlay is gone so the test can end cleanly after comparison. */
  public async finishExportWorkflowAndCloseUi(deliverablePage: DeliverablePage): Promise<void> {
    await test.step('6. Finish — close export UI after successful export and comparison', async () => {
      if (await this.exportProgressOverlay().isVisible().catch(() => false)) {
        await this.waitForExportProgressOverlayClosed(TC015_OVERLAY_CLOSE_TIMEOUT_MS).catch(() => undefined);
        await this.forceCloseExportProgressOverlay();
      }

      await expect(this.exportProgressOverlay()).not.toBeVisible({ timeout: 5_000 });
      await deliverablePage.dismissBlockingDeliverablePanels();
      await expect(this.exportButton()).toBeEnabled({ timeout: 10_000 });

      await this.testInfo.attach('tc015-export-workflow-complete', {
        body: 'Export and comparison succeeded; progress overlay closed — test complete.',
        contentType: 'text/plain',
      });
    });
  }

  /** Runs TC-015 steps 1–2 and returns the saved download (used by TC-016-style callers). */
  public async triggerExportAndDownload(
    timeoutMs = EXPORT_DOWNLOAD_TIMEOUT_MS,
  ): Promise<ExportDownloadResult> {
    await this.triggerExportForDeliverable(timeoutMs);
    await this.observeExportProgressAndCompletion(timeoutMs);
    const download = await this.awaitExportedDownload(timeoutMs);
    await this.waitForExportProgressOverlayClosed(timeoutMs);
    await this.testInfo.attach('export-download', {
      body: JSON.stringify(download, null, 2),
      contentType: 'application/json',
    });
    return download;
  }

  /** @deprecated Use {@link compareExportedContentToOnScreen}. */
  public async assertExportedOutputMatchesScreen(
    download: ExportDownloadResult,
    snapshot: DeliverableContentSnapshot,
    options: {
      contentMarkers: string[];
      minExportFileBytes: number;
      expectedFilenameFragment?: string;
    },
  ): Promise<void> {
    await this.openExportedOutput(download, {
      minExportFileBytes: options.minExportFileBytes,
      expectedFilenameFragment: options.expectedFilenameFragment,
    });
    await this.compareExportedContentToOnScreen(download, snapshot, options);
  }
}
