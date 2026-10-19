import {
  DELIVERABLE_STAGE_LOAD_TIMEOUT_MS,
  DELIVERABLE_STAGE_NAVIGATION_SETTLE_MS,
} from '@data/dashboard/deliverable/deliverable-stage-navigation.timeouts';
import type {
  DeliverableEditorStage,
  DeliverableStageNavigationScenario,
} from '@interface/dashboard/deliverable-stage-navigation.interface';
import { expect, Locator, Page, test, TestInfo } from '@playwright/test';

export interface DeliverableStageSnapshot {
  briefText: string;
  settingsExcerpt: string;
}

export interface StageNavigationTiming {
  from: DeliverableEditorStage;
  to: DeliverableEditorStage;
  durationMs: number;
}

export class DeliverableStageNavigationPage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
  }

  private stageLoadTimeoutMs(scenario: DeliverableStageNavigationScenario): number {
    return scenario.maxStageLoadMs ?? DELIVERABLE_STAGE_LOAD_TIMEOUT_MS;
  }

  /**
   * Stage control — **Configure** flow uses `1. Brief` / `2. Settings`;
   * **generated** deliverables use compact `1` / `2` buttons + `3. Deliverable` label.
   */
  private stageTab(stage: DeliverableEditorStage): Locator {
    if (stage === 'Brief') {
      return this.page
        .getByRole('button', { name: /1\.\s*Brief/i })
        .or(this.page.getByRole('button', { name: /^1$/ }))
        .or(this.page.getByText(/^1\.\s*Brief$/i))
        .first();
    }
    if (stage === 'Settings') {
      return this.page
        .getByRole('button', { name: /2\.\s*Settings/i })
        .or(this.page.getByRole('button', { name: /^2$/ }))
        .or(this.page.getByText(/^2\.\s*Settings$/i))
        .first();
    }
    return this.page
      .getByRole('button', { name: /3\.\s*Deliverable/i })
      .or(this.page.getByText(/^3\.\s*Deliverable$/i))
      .first();
  }

  private briefStageAnchor(): Locator {
    return this.page
      .getByRole('heading', { name: /Now Is Time To Deliver/i })
      .or(this.page.getByText(/Describe the deliverable you need/i))
      .or(this.page.getByText(/Approach And Framing|Explain the business context/i))
      .or(this.page.getByPlaceholder(/business context|Type something here|market entry/i))
      .or(this.page.getByRole('button', { name: /Improve My Brief/i }))
      .or(this.page.getByRole('button', { name: /^My Brief$/i }))
      .first();
  }

  private briefTextarea(): Locator {
    return this.page
      .locator('main textarea:visible, form textarea:visible')
      .filter({ hasNot: this.page.getByPlaceholder(/Search Clients/i) })
      .or(this.page.locator('main [contenteditable="true"]').first())
      .first();
  }

  private async openBriefPanelIfNeeded(): Promise<void> {
    const tab1 = this.page
      .getByRole('button', { name: /^1$/ })
      .or(this.page.getByRole('button', { name: /1\.\s*Brief/i }))
      .first();
    if (await tab1.isVisible().catch(() => false)) {
      await tab1.click({ force: true });
      await this.page.waitForTimeout(400);
    }

    const myBrief = this.page.getByRole('button', { name: /^My Brief$/i });
    if (await myBrief.isVisible().catch(() => false)) {
      await myBrief.click({ force: true });
      await this.page.waitForTimeout(400);
    }
  }

  private settingsStageAnchor(): Locator {
    return this.page
      .getByRole('heading', { name: /Configure Deliverable/i })
      .or(this.page.getByRole('heading', { name: /^Ambition$/i }))
      .or(this.page.getByRole('heading', { name: /^Scope & boundaries$/i }))
      .or(this.page.getByText(/^Geographical Scope$/i))
      .or(this.page.getByText(/^Project objectives and context/i))
      .first();
  }

  private async isBriefStageAlreadyActive(): Promise<boolean> {
    if (!(await this.briefStageAnchor().isVisible().catch(() => false))) {
      return false;
    }
    if (await this.briefTextarea().isVisible().catch(() => false)) {
      return true;
    }
    if (
      await this.page
        .getByRole('button', { name: /Improve My Brief/i })
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
    if (await this.page.getByRole('button', { name: /^My Brief$/i }).isVisible().catch(() => false)) {
      return true;
    }
    return await this.page
      .getByText(/Approach And Framing|Explain the business context/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  private async isSettingsStageAlreadyActive(): Promise<boolean> {
    const workDetails = await this.page
      .getByRole('heading', { name: /^Work details$/i })
      .first()
      .isVisible()
      .catch(() => false);
    const deliverableType = await this.page
      .getByText(/^Deliverable Type$/i)
      .first()
      .isVisible()
      .catch(() => false);
    return workDetails && deliverableType;
  }

  private deliverableStageAnchor(): Locator {
    return this.page
      .getByRole('heading', { level: 2 })
      .filter({ hasText: /deliverable/i })
      .or(this.page.getByText(/^3\.\s*Deliverable$/i))
      .or(this.page.locator('[class*="slide"]').first())
      .first();
  }

  public async assertStageStepperVisible(): Promise<void> {
    await test.step('Assert deliverable stage stepper (Brief / Settings / Deliverable)', async () => {
      await expect(
        this.page
          .getByRole('button', { name: /^1$/ })
          .or(this.page.getByRole('button', { name: /1\.\s*Brief/i }))
          .or(this.page.getByText(/1\.\s*Brief/i))
          .first(),
      ).toBeVisible({ timeout: 20_000 });

      await expect(
        this.page
          .getByRole('button', { name: /^2$/ })
          .or(this.page.getByText(/2\.\s*Settings/i))
          .first(),
      ).toBeVisible({ timeout: 10_000 });

      const stepThree = this.page
        .getByText(/3\.\s*Deliverable/i)
        .or(
          this.page
            .locator('motion.div, div')
            .filter({
              has: this.page
                .getByRole('button', { name: /^2$/ })
                .or(this.page.getByText(/2\.\s*Settings/i)),
            })
            .getByText(/^3$/),
        );
      await expect(stepThree.first()).toBeVisible({ timeout: 10_000 });
    });
  }

  private async clickStageTab(stage: DeliverableEditorStage): Promise<void> {
    const tab = this.stageTab(stage);
    if (stage === 'Deliverable' && (await tab.count()) === 0) {
      return;
    }
    if (stage === 'Deliverable' && (await tab.getAttribute('role')) !== 'button') {
      return;
    }

    if (stage === 'Brief') {
      const tab1 = this.page.getByRole('button', { name: /^1$/ }).first();
      if (await tab1.isVisible().catch(() => false)) {
        await tab1.click({ force: true });
        return;
      }
      const briefLabel = this.page.getByText(/^1\.\s*Brief$/i).first();
      if (await briefLabel.isVisible().catch(() => false)) {
        await briefLabel.click({ force: true });
        return;
      }
    }

    if (stage === 'Settings') {
      const tab2 = this.page.getByRole('button', { name: /^2$/ }).first();
      if (await tab2.isVisible().catch(() => false)) {
        await tab2.click({ force: true });
        return;
      }
    }

    await tab.scrollIntoViewIfNeeded().catch(() => {});
    await tab.click({ force: true, timeout: 10_000 });
  }

  private async waitAfterStageNavigation(
    stage: DeliverableEditorStage,
    settleMs?: number,
  ): Promise<void> {
    const ms = settleMs ?? DELIVERABLE_STAGE_NAVIGATION_SETTLE_MS;
    if (ms <= 0) {
      return;
    }
    await test.step(`Wait ${ms / 1000}s after ${stage} navigation`, async () => {
      await this.page.waitForTimeout(ms);
    });
  }

  public async waitForStageReady(
    stage: DeliverableEditorStage,
    timeoutMs: number,
  ): Promise<void> {
    const timeout = timeoutMs;
    switch (stage) {
      case 'Brief':
        await this.openBriefPanelIfNeeded();
        await expect(this.briefStageAnchor()).toBeVisible({ timeout });
        if (!(await this.isBriefStageAlreadyActive())) {
          await expect(this.briefTextarea()).toBeVisible({ timeout });
        }
        break;
      case 'Settings':
        await expect(this.settingsStageAnchor()).toBeVisible({ timeout });
        await expect(
          this.page
            .getByRole('heading', { name: /^Work details$/i })
            .or(this.page.getByText(/^Business Scope$/i))
            .first(),
        ).toBeVisible({ timeout });
        break;
      case 'Deliverable':
        await expect(this.deliverableStageAnchor()).toBeVisible({ timeout });
        break;
      default:
        throw new Error(`Unknown stage: ${stage as string}`);
    }
  }

  public async navigateToStage(
    stage: DeliverableEditorStage,
    scenario: DeliverableStageNavigationScenario,
    from?: DeliverableEditorStage,
  ): Promise<StageNavigationTiming | null> {
    const maxMs = this.stageLoadTimeoutMs(scenario);
    const startedAt = Date.now();

    await test.step(`Navigate to ${stage}`, async () => {
      if (stage === 'Brief' && (await this.isBriefStageAlreadyActive())) {
        await this.waitForStageReady(stage, maxMs);
        await this.waitAfterStageNavigation(stage, scenario.stageSettleMs);
        return;
      }
      if (stage === 'Settings' && (await this.isSettingsStageAlreadyActive())) {
        await this.waitForStageReady(stage, maxMs);
        await this.waitAfterStageNavigation(stage, scenario.stageSettleMs);
        return;
      }
      if (stage === 'Brief') {
        await this.openBriefPanelIfNeeded();
      }
      await this.clickStageTab(stage);
      await this.waitForStageReady(stage, maxMs);
      await this.waitAfterStageNavigation(stage, scenario.stageSettleMs);
    });

    const durationMs = Date.now() - startedAt;
    if (from) {
      return { from, to: stage, durationMs };
    }
    return null;
  }

  public async captureBriefText(): Promise<string> {
    await this.waitForStageReady('Brief', DELIVERABLE_STAGE_LOAD_TIMEOUT_MS);
    const fromTextarea = (await this.briefTextarea().inputValue().catch(() => '')).trim();
    if (fromTextarea.length > 0) {
      return fromTextarea;
    }
    const fromEditable = (await this.briefTextarea().innerText().catch(() => '')).trim();
    if (fromEditable.length > 0) {
      return fromEditable;
    }
    const region = this.page.locator('main').first();
    return (await region.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 2000);
  }

  public async captureSettingsExcerpt(): Promise<string> {
    await this.waitForStageReady('Settings', DELIVERABLE_STAGE_LOAD_TIMEOUT_MS);
    const anchor = this.settingsStageAnchor();
    const region = anchor.locator(
      'xpath=ancestor::*[.//h3[normalize-space()="Work details"] or .//*[normalize-space()="Geographical Scope"]][1]',
    );
    const text =
      (await region.innerText().catch(() => '')) ||
      (await anchor.locator('xpath=ancestor::main[1]').innerText().catch(() => ''));
    return text.replace(/\s+/g, ' ').trim();
  }

  public async captureStageSnapshot(stage: DeliverableEditorStage): Promise<DeliverableStageSnapshot> {
    if (stage === 'Brief') {
      return { briefText: await this.captureBriefText(), settingsExcerpt: '' };
    }
    if (stage === 'Settings') {
      return { briefText: '', settingsExcerpt: await this.captureSettingsExcerpt() };
    }
    return { briefText: await this.captureBriefText().catch(() => ''), settingsExcerpt: '' };
  }

  public assertSnapshotsMatch(
    label: string,
    before: DeliverableStageSnapshot,
    after: DeliverableStageSnapshot,
  ): void {
    if (before.briefText && after.briefText) {
      expect(after.briefText, `${label}: brief text retained`).toBe(before.briefText);
    }
    if (before.settingsExcerpt && after.settingsExcerpt) {
      expect(after.settingsExcerpt, `${label}: settings content retained`).toBe(
        before.settingsExcerpt,
      );
    }
  }

  public assertTimingsWithinBudget(
    timings: StageNavigationTiming[],
    maxMs: number,
  ): void {
    for (const row of timings) {
      expect(
        row.durationMs,
        `${row.from} → ${row.to} should load within ${maxMs}ms`,
      ).toBeLessThanOrEqual(maxMs);
    }
  }

  public async attachNavigationTimings(timings: StageNavigationTiming[]): Promise<void> {
    await this.testInfo.attach('stage-navigation-timings', {
      body: JSON.stringify({ timings }, null, 2),
      contentType: 'application/json',
    });
  }

  private briefStepCompleteMarkers(): Locator {
    return this.page.locator(
      '[class*="text-green"], [class*="bg-green"], [class*="border-green"], [class*="emerald"], svg.lucide-check, svg.lucide-circle-check, [data-state="complete"]',
    );
  }

  /** `1` / **1. Brief** step shows green or checkmark (complete) after Generate deliverable. */
  public async isBriefStepGreen(): Promise<boolean> {
    if (this.page.isClosed()) {
      return false;
    }

    const markers = this.briefStepCompleteMarkers();
    const briefButton = this.page.getByRole('button', { name: /^1$/ });
    if (
      await briefButton
        .locator('xpath=ancestor-or-self::*')
        .filter({ has: markers })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }

    const briefNamed = this.page
      .getByRole('button', { name: /1\.\s*Brief/i })
      .or(this.page.getByText(/^1\.\s*Brief$/i));
    if (
      await briefNamed
        .locator('xpath=ancestor-or-self::*')
        .filter({ has: markers })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }

    return await this.page
      .locator('button, div, span, p')
      .filter({ hasText: /^1\.?\s*Brief$|^1$/i })
      .filter({ has: markers })
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Post-generation: green check beside **3. Deliverable** in the stage stepper. */
  public deliverableStageGreenComplete(): Locator {
    return this.page
      .locator(
        'xpath=//span[normalize-space()="3. Deliverable"]/../*[(self::motion.div or self::div) and contains(@class,"rounded-full") and contains(@class,"bg-green-500")]',
      )
      .or(
        this.page
          .locator('span')
          .filter({ hasText: /^3\.\s*Deliverable$/i })
          .locator('xpath=ancestor::*[1]//*[contains(@class,"bg-green-500")]')
          .first(),
      );
  }

  public exportButton(): Locator {
    return this.page.getByRole('button', { name: /^Export$/i }).first();
  }

  /** Tab **3. Deliverable** only — never detour through Brief. */
  public async navigateToDeliverableStageDirect(): Promise<void> {
    if (await this.exportButton().isVisible().catch(() => false)) {
      return;
    }

    const deliverableTab = this.page
      .getByText(/^3\.\s*Deliverable$/i)
      .or(this.page.getByRole('button', { name: /^3$/ }));
    if (await deliverableTab.first().isVisible().catch(() => false)) {
      await deliverableTab.first().click({ force: true, timeout: 5_000 });
      await this.page.waitForTimeout(300);
    }
  }

  /** Main deliverable canvas — avoids sidebar/tree spinners blocking completion. */
  private deliverableWorkspaceRegion(): Locator {
    return this.page
      .locator('[role="main"]')
      .last()
      .or(this.page.locator('div').filter({ has: this.exportButton() }).last());
  }

  public async hasActiveGenerationSpinner(): Promise<boolean> {
    const inWorkspace = await this.deliverableWorkspaceRegion()
      .locator('[class*="animate-spin"], [aria-busy="true"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (inWorkspace) {
      return true;
    }

    const generatingCopy = await this.page
      .getByText(/generating|storyline generation in progress|please wait|processing your/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!generatingCopy) {
      return false;
    }

    return await this.page
      .locator('[class*="animate-spin"], [aria-busy="true"]')
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Enabled Export — primary signal that generation finished. */
  public async isExportReady(): Promise<boolean> {
    const exportBtn = this.exportButton();
    return (
      (await exportBtn.isVisible().catch(() => false)) &&
      (await exportBtn.isEnabled().catch(() => false))
    );
  }

  /**
   * Strict completion — **enabled Export** or green **3. Deliverable** (not Brief green / visible-only Export).
   */
  public async isDeliverableGenerationComplete(): Promise<boolean> {
    if (await this.isExportReady()) {
      return true;
    }

    if (await this.hasActiveGenerationSpinner()) {
      return false;
    }

    return await this.deliverableStageGreenComplete().isVisible().catch(() => false);
  }

  /** True while Progress / spinner / generating UI is active and generation is not yet complete. */
  public async isDeliverableGenerationInProgress(): Promise<boolean> {
    if (await this.isDeliverableGenerationComplete()) {
      return false;
    }

    const generatingCopy = await this.page
      .getByText(/generating|processing|in progress|please wait|storyline generation in progress/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (generatingCopy) {
      return true;
    }

    if (await this.hasActiveGenerationSpinner()) {
      return true;
    }

    const progressVisible = await this.page
      .getByText(/^Progress$/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (progressVisible) {
      const pct = await this.page
        .getByText(/\d+%\s*complete/i)
        .first()
        .isVisible()
        .catch(() => false);
      return pct;
    }

    return false;
  }

  public async waitForBriefStepGreen(timeoutMs: number): Promise<void> {
    await test.step('Wait until Brief step is green (complete)', async () => {
      await this.page.waitForLoadState('load').catch(() => {});
      await expect(
        this.page
          .getByRole('button', { name: /^1$/ })
          .or(this.page.getByText(/1\.\s*Brief/i))
          .first(),
      ).toBeVisible({ timeout: 60_000 });

      await expect
        .poll(
          async () => {
            if (this.page.isClosed()) {
              throw new Error('Browser page closed while waiting for Brief step to turn green');
            }
            return this.isBriefStepGreen();
          },
          {
            timeout: timeoutMs,
            intervals: [500, 1000, 2000, 3000, 5000],
            message: 'Brief step did not turn green after Generate deliverable',
          },
        )
        .toBe(true);
    });
  }
}
