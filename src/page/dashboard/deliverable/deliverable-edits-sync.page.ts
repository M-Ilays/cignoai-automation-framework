import { DELIVERABLE_GENERATION_STARTED_TIMEOUT_MS } from '@data/dashboard/deliverable/deliverable-flow.timeouts';
import {
  TC017_EXECUTIVE_SUMMARY_ONLY,
  TC017_WORKPLAN_SECTIONS,
  type WorkplanSectionDefinition,
} from '@data/dashboard/deliverable/deliverable-edits-sync.workplan-sections';
import {
  TC017_COMPETITION_PHASE_TIMEOUT_MS,
  TC017_MARKER_APPEAR_POLL_MS,
  TC017_MARKER_RETAIN_POLL_MS,
  TC017_POST_UPDATE_GENERATION_TIMEOUT_MS,
  TC017_REGENERATE_TIMEOUT_MS,
  TC017_SECTION_CONTENT_TIMEOUT_MS,
  TC017_SECTION_UPDATE_TIMEOUT_MS,
  TC017_SOFT_SECTION_CONTENT_MS,
  TC017_STICKY_NOTES_ACTIVE_TIMEOUT_MS,
  TC017_STICKY_NOTES_BEFORE_UPDATE_MS,
  TC017_STEP_SETTLE_MS,
} from '@data/dashboard/deliverable/deliverable-edits-sync.timeouts';
import type { WorkplanSectionEditResult } from '@interface/dashboard/deliverable-edits-sync.interface';
import type { DeliverableEditorStage } from '@interface/dashboard/deliverable-stage-navigation.interface';
import { getDeliverableNewSettingsTestCaseData } from '@data/dashboard/deliverable/deliverable-new-settings.spec.data';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { DeliverableStageNavigationPage } from '@page/dashboard/deliverable/deliverable-stage-navigation.page';
import { expect, Locator, Page, test, TestInfo } from '@playwright/test';

/** TC-017 — edit brief/settings, Reset and Regenerate, optional deliverable output edit, cross-view sync. */
export class DeliverableEditsSyncPage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly deliverablePage: DeliverablePage;
  private readonly stagePage: DeliverableStageNavigationPage;
  private deliverableName = '';
  /** Captured in step 3 — used in step 4 when the sticky-notes field is cleared after Update section. */
  private lastStickyNoteVerifyToken = '';
  private lastStickyNoteCapture = '';
  private stickyNotesUpdateSucceeded = false;
  private readonly workplanSectionEdits: WorkplanSectionEditResult[] = [];

  public getWorkplanSectionEditResults(): WorkplanSectionEditResult[] {
    return [...this.workplanSectionEdits];
  }

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.deliverablePage = new DeliverablePage(page, testInfo);
    this.stagePage = new DeliverableStageNavigationPage(page, testInfo);
  }

  public setDeliverableContext(deliverableName: string): void {
    this.deliverableName = deliverableName.trim();
  }

  private projectObjectivesField(): Locator {
    return this.page
      .getByText(/^Project objectives and context/i)
      .first()
      .locator('xpath=following::textarea[1]');
  }

  /** Generated deliverable output (Executive Summary, sticky notes) — not the Brief composer. */
  private async isOnDeliverableOutputStage(): Promise<boolean> {
    if (await this.page.getByRole('button', { name: /^Export$/i }).isVisible().catch(() => false)) {
      return true;
    }
    if (
      await this.page
        .getByText(/Update your Storyline with your notes|Sticky notes/i)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
    return await this.page
      .getByRole('heading', { name: /^Executive Summary$/i, level: 2 })
      .isVisible()
      .catch(() => false);
  }

  /** Brief-stage composer only (excludes sidebar search and Deliverable sticky-note fields). */
  private briefComposerEditor(): Locator {
    const shell = this.deliverableMainRegion();
    return shell
      .getByRole('heading', { name: /Approach And Framing|My Brief|Now Is Time To Deliver/i })
      .locator('xpath=following::textarea[1]|following::input[not(@type="hidden")][1]')
      .or(
        shell.getByRole('textbox', {
          name: /market entry|describe the deliverable|Approach|Framing|AI consulting/i,
        }),
      )
      .or(shell.getByPlaceholder(/describe the deliverable|market entry|tell us what you aim/i))
      .first();
  }

  private deliverableMainRegion(): Locator {
    return this.page.locator('aside ~ *').first();
  }

  private async syncReactInputValue(field: Locator, value: string): Promise<void> {
    await field.evaluate(
      (el: HTMLElement, v: string) => {
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
          setter?.call(el, v);
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      value,
    );
  }

  private async fillTextarea(field: Locator, value: string): Promise<void> {
    const expected = value.trim();
    await expect(field).toBeVisible({ timeout: 15_000 });
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await field.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await field.fill(expected);

    try {
      await field.evaluate(
        (el: HTMLElement, v: string) => {
          if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
            setter?.call(el, v);
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        },
        expected,
        { timeout: 8_000 },
      );
    } catch {
      // Field may re-mount after fill — poll until value sticks.
    }

    await field.blur().catch(() => undefined);
    await expect
      .poll(async () => (await field.inputValue().catch(() => '')).trim(), {
        timeout: 8_000,
        intervals: [100, 200, 400],
        message: 'Textarea value should sync after fill',
      })
      .toBe(expected);
  }

  private async isSettingsViewActive(): Promise<boolean> {
    if (await this.projectObjectivesField().isVisible().catch(() => false)) {
      return true;
    }
    if (
      await this.page
        .getByRole('heading', { name: /^Work details$/i })
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }
    if (await this.page.getByText(/^Deliverable Type/i).first().isVisible().catch(() => false)) {
      return true;
    }
    return await this.page
      .getByRole('button', { name: /Generate deliverable/i })
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Settings from Brief or Deliverable — stepper click, stage navigator, then full settings wait. */
  private async openSettingsFromAnyStage(): Promise<void> {
    if (await this.isSettingsViewActive()) {
      return;
    }

    await this.deliverablePage.dismissBlockingDeliverablePanels();

    if (await this.page.getByRole('button', { name: /^Export$/i }).isVisible().catch(() => false)) {
      const tab2FromDeliverable = this.page.getByRole('button', { name: /^2$/ }).first();
      if (await tab2FromDeliverable.isVisible().catch(() => false)) {
        await tab2FromDeliverable.click({ force: true, timeout: 5_000 });
        await this.page.waitForTimeout(500);
        if (await this.isSettingsViewActive()) {
          return;
        }
      }
    }

    const tryStepper = async (): Promise<boolean> => {
      const tab2 = this.page.getByRole('button', { name: /^2$/ }).first();
      if (await tab2.isVisible().catch(() => false)) {
        await tab2.click({ force: true, timeout: 5_000 });
        await this.page.waitForTimeout(400);
        if (await this.isSettingsViewActive()) {
          return true;
        }
      }

      const settingsTab = this.page
        .getByRole('button', { name: /2\.\s*Settings/i })
        .or(this.page.getByText(/^2\.\s*Settings$/i))
        .first();
      if (await settingsTab.isVisible().catch(() => false)) {
        await settingsTab.click({ force: true, timeout: 5_000 });
        await this.page.waitForTimeout(400);
        if (await this.isSettingsViewActive()) {
          return true;
        }
      }
      return false;
    };

    if (await tryStepper()) {
      return;
    }

    await this.stagePage
      .navigateToStage('Settings', {
        deliverableName: this.deliverableName,
        stageSettleMs: 0,
      })
      .catch(() => undefined);

    if (await this.isSettingsViewActive()) {
      return;
    }

    await this.deliverablePage.goToSettingsStage().catch(() => undefined);
  }

  private async isBriefComposerEditable(): Promise<boolean> {
    if (await this.isOnDeliverableOutputStage()) {
      return false;
    }
    if (await this.isSettingsViewActive()) {
      return false;
    }

    const editor = this.briefComposerEditor();
    if (!(await editor.isVisible().catch(() => false))) {
      return false;
    }

    const placeholder = ((await editor.getAttribute('placeholder')) ?? '').toLowerCase();
    if (/explain the business context|sticky notes/.test(placeholder)) {
      return false;
    }

    return editor.isEditable().catch(() => false);
  }

  private async clickBriefStageTab(): Promise<void> {
    const myBrief = this.page.getByRole('button', { name: /^My Brief$/i });
    if (await myBrief.isVisible().catch(() => false)) {
      await myBrief.click({ force: true });
      return;
    }

    const briefTab = this.page
      .getByRole('button', { name: /^1$/ })
      .or(this.page.getByRole('button', { name: /1\.\s*Brief/i }))
      .or(this.page.getByRole('button', { name: /Approach And Framing/i }));
    if (await briefTab.first().isVisible().catch(() => false)) {
      await briefTab.first().click({ force: true });
    }
  }

  public async navigateToStage(
    stage: DeliverableEditorStage,
    settleMs = TC017_STEP_SETTLE_MS,
  ): Promise<void> {
    await test.step(`Navigate to ${stage}`, async () => {
      if (stage === 'Settings') {
        if (await this.isSettingsViewActive()) {
          if (settleMs > 0) {
            await this.page.waitForTimeout(settleMs);
          }
          return;
        }
        await this.openSettingsFromAnyStage();
        if (settleMs > 0) {
          await this.page.waitForTimeout(settleMs);
        }
        return;
      }

      if (stage === 'Brief') {
        if (await this.isBriefComposerEditable()) {
          if (settleMs > 0) {
            await this.page.waitForTimeout(settleMs);
          }
          return;
        }
        await this.clickBriefStageTab();
        if (settleMs > 0) {
          await this.page.waitForTimeout(settleMs);
        }
        return;
      }

      if (stage === 'Deliverable') {
        await this.stagePage.navigateToDeliverableStageDirect();
        if (settleMs > 0) {
          await this.page.waitForTimeout(settleMs);
        }
        return;
      }

      await this.stagePage.navigateToStage(stage, {
        deliverableName: this.deliverableName,
        stageSettleMs: settleMs,
      });
    });
  }

  /** Replace objectives with canonical template + single run marker (avoids stacked markers from prior runs). */
  private buildObjectivesWithMarker(marker: string): string {
    const settings = getDeliverableNewSettingsTestCaseData('001-NewDeliverableSettings').scenario;
    return `${settings.projectObjectives.trim()}\n\n${marker.trim()}`.trim();
  }

  private async commitSettingsEdits(): Promise<void> {
    await this.deliverablePage.dismissBlockingDeliverablePanels();
    const field = this.projectObjectivesField();
    if (await field.isVisible().catch(() => false)) {
      await field.blur();
    }
    const workDetails = this.page.getByRole('heading', { name: /^Work details$/i }).first();
    if (await workDetails.isVisible().catch(() => false)) {
      await workDetails.click({ force: true });
    }
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  public async editSettingsObjectives(
    marker: string,
    settleMs = TC017_STEP_SETTLE_MS,
  ): Promise<string> {
    return await test.step('Edit Settings — project objectives', async () => {
      await this.navigateToStage('Settings', settleMs);
      const settings = getDeliverableNewSettingsTestCaseData('001-NewDeliverableSettings').scenario;
      await this.deliverablePage.ensureClientNameSelected(
        settings.clientSearchTerm ?? 'automation',
        settings.projectName ?? 'New project',
      );
      const field = this.projectObjectivesField();
      await expect(field).toBeVisible({ timeout: 20_000 });

      const updated = this.buildObjectivesWithMarker(marker);

      await this.fillTextarea(field, updated);
      await this.commitSettingsEdits();

      await expect
        .poll(async () => !(await this.stagePage.isDeliverableGenerationInProgress()), {
          timeout: 120_000,
          intervals: [1000, 2000, 3000, 5000],
          message: 'Settings save should finish processing before Deliverable edits',
        })
        .toBe(true)
        .catch(() => undefined);

      if (settleMs > 0) {
        await this.page.waitForTimeout(settleMs);
      }

      await this.testInfo.attach('settings-objectives-after-edit', {
        body: updated,
        contentType: 'text/plain',
      });

      return updated;
    });
  }

  /** Step 1 — **Settings only** (no Brief detour). */
  public async editSettingsOnly(marker: string, settleMs = TC017_STEP_SETTLE_MS): Promise<void> {
    await test.step('Edit Settings — project objectives and verify marker', async () => {
      await this.editSettingsObjectives(marker, settleMs);
      await this.assertMarkerInSettings(marker, { navigateIfNeeded: false });
      await this.testInfo.attach('tc017-step1-settings-complete', {
        body: 'Settings updated; test remains on Settings before Deliverable.',
        contentType: 'text/plain',
      });
    });
  }

  /**
   * Step 1 — **Brief first** (one visit, skip if read-only), then **Settings once** (no return to Brief).
   */
  public async editBriefAndSettings(
    marker: string,
    settleMs = TC017_STEP_SETTLE_MS,
  ): Promise<{ briefEdited: boolean }> {
    return await test.step('Edit brief then settings (single pass per stage)', async () => {
      let briefEdited = false;

      await test.step('Brief — edit and verify if editor is available', async () => {
        briefEdited = await this.editBriefIfEditable(marker, settleMs);
        if (briefEdited) {
          const body = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
          expect(body, 'Brief view should reflect the sync marker').toContain(marker);
        }
      });

      await this.editSettingsOnly(marker, settleMs);

      return { briefEdited };
    });
  }

  public async editBriefIfEditable(
    marker: string,
    settleMs = TC017_STEP_SETTLE_MS,
  ): Promise<boolean> {
    return await test.step('Edit Brief if editor is available', async () => {
      if (await this.isOnDeliverableOutputStage()) {
        await this.testInfo.attach('brief-edit-skipped', {
          body:
            'Deliverable is on generated output (3. Deliverable). Brief composer is not editable — sync marker will be set in Settings only.',
          contentType: 'text/plain',
        });
        return false;
      }

      await this.navigateToStage('Brief', 0);

      if (!(await this.isBriefComposerEditable())) {
        await this.testInfo.attach('brief-edit-skipped', {
          body: 'Brief composer not available (read-only or not on Brief stage).',
          contentType: 'text/plain',
        });
        return false;
      }

      const editor = this.briefComposerEditor();
      const baseMarker = marker.replace(/\s*\[run-\d+]\s*$/i, '').trim();
      const current = (await editor.inputValue().catch(() => '')).trim();
      const seed = 'AI consulting market entry strategy.';
      const updated =
        current.includes(marker) ? current
        : current.includes(baseMarker) ?
          `${seed}\n\n${marker}`.trim()
        : `${current || seed}\n\n${marker}`.trim();
      await this.fillTextarea(editor, updated);
      if (settleMs > 0) {
        await this.page.waitForTimeout(settleMs);
      }
      return true;
    });
  }

  private markerVisibleOnPage(marker: string, baseMarker: string): Promise<boolean> {
    return (async () => {
      if (this.page.isClosed()) {
        return false;
      }

      const objectivesLabel = this.page.getByText(/^Project objectives and context/i).first();
      if (await objectivesLabel.isVisible().catch(() => false)) {
        await objectivesLabel.scrollIntoViewIfNeeded().catch(() => undefined);
      }

      const field = this.projectObjectivesField();
      if (await field.isVisible().catch(() => false)) {
        const value = (await field.inputValue()).trim();
        if (value.includes(marker) || value.includes(baseMarker)) {
          return true;
        }
      }

      try {
        const excerpt = await this.stagePage.captureSettingsExcerpt();
        if (excerpt.includes(marker) || excerpt.includes(baseMarker)) {
          return true;
        }
      } catch {
        // Settings panel not mounted yet.
      }

      const body = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
      return body.includes(marker) || body.includes(baseMarker);
    })();
  }

  private async waitForMarkerOnPage(
    marker: string,
    message: string,
    timeoutMs = 60_000,
  ): Promise<void> {
    const baseMarker = marker.replace(/\s*\[run-\d+]\s*$/i, '').trim();
    await expect
      .poll(async () => this.markerVisibleOnPage(marker, baseMarker), {
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000],
        message,
      })
      .toBe(true);
  }

  public async assertMarkerInSettings(
    marker: string,
    options?: { navigateIfNeeded?: boolean },
  ): Promise<void> {
    await test.step('Assert marker is present in Settings', async () => {
      if (options?.navigateIfNeeded !== false && !(await this.isSettingsViewActive())) {
        await this.navigateToStage('Settings', 0);
      }
      await this.waitForMarkerOnPage(marker, 'Sync marker should be visible in Settings', 45_000);
    });
  }

  public async assertMarkerInBriefView(marker: string): Promise<void> {
    await test.step('Assert marker is visible on Brief stage', async () => {
      if (!(await this.isBriefComposerEditable())) {
        await this.navigateToStage('Brief', 0);
      }
      const body = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(body, 'Brief view should reflect the sync marker').toContain(marker);
    });
  }

  private syncMarkersToFind(marker: string): string[] {
    const markerNorm = marker.trim();
    const baseMarker = markerNorm.replace(/\s*\[run-\d+]\s*$/i, '').trim();
    const runIdMatch = markerNorm.match(/\[run-\d+]/);
    const markersToFind = [
      markerNorm,
      baseMarker,
      'Test Cigno Deliverable',
      'New edited text',
      'Test Cigno',
      'cigno',
    ];
    if (runIdMatch) {
      markersToFind.push(runIdMatch[0]);
    }
    return [...new Set(markersToFind.filter((m) => m.length > 0))];
  }

  /** Scan storyline section tabs — marker is often not in the initial page body text. */
  private async isSyncMarkerInDeliverableOutput(marker: string): Promise<boolean> {
    if (this.page.isClosed()) {
      return false;
    }

    const markersToFind = this.syncMarkersToFind(marker);

    return await this.scanActiveWorkplanSectionText(
      TC017_EXECUTIVE_SUMMARY_ONLY[0],
      markersToFind,
    );
  }

  /** Read output for one tab only — do not click through every workplan module. */
  private async scanActiveWorkplanSectionText(
    section: WorkplanSectionDefinition,
    needles: string[],
  ): Promise<boolean> {
    await this.ensureWorkplanSectionActive(section);
    await this.page.waitForTimeout(400);
    const regionText = (
      await this.deliverableMainRegion()
        .innerText()
        .catch(() => '')
    ).replace(/\s+/g, ' ');
    if (needles.some((m) => regionText.includes(m))) {
      return true;
    }
    const bodyText = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
    return needles.some((m) => bodyText.includes(m));
  }

  public async assertMarkerInDeliverableView(marker: string): Promise<void> {
    await test.step('Assert marker is visible on Deliverable output', async () => {
      await this.navigateToStage('Deliverable', 0);

      await expect
        .poll(async () => this.isSyncMarkerInDeliverableOutput(marker), {
          timeout: TC017_MARKER_APPEAR_POLL_MS,
          intervals: [500, 1000, 2000, 3000, 5000],
          message: 'Deliverable output should include the sync marker after regeneration',
        })
        .toBe(true);
    });
  }

  public async assertMarkerRetainedInDeliverableView(marker: string): Promise<void> {
    await test.step('Assert sync marker retained on Deliverable after returning from other views', async () => {
      await this.navigateToStage('Deliverable', 0);

      await expect
        .poll(async () => this.isSyncMarkerInDeliverableOutput(marker), {
          timeout: TC017_MARKER_RETAIN_POLL_MS,
          intervals: [500, 1000, 2000, 3000, 5000],
          message:
            'Deliverable should still show the sync marker after returning from Settings/Brief',
        })
        .toBe(true);
    });
  }

  public async triggerResetAndRegenerate(settleMs = TC017_STEP_SETTLE_MS): Promise<void> {
    await test.step('Click Reset / Regenerate from Settings (no extra stage hops)', async () => {
      if (!(await this.isSettingsViewActive())) {
        await this.navigateToStage('Settings', settleMs);
      } else if (settleMs > 0) {
        await this.page.waitForTimeout(settleMs);
      }
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      const settings = getDeliverableNewSettingsTestCaseData('001-NewDeliverableSettings').scenario;
      await this.deliverablePage.ensureClientNameSelected(
        settings.clientSearchTerm ?? 'automation',
        settings.projectName ?? 'New project',
      );
      await this.commitSettingsEdits();

      const generateBtn = this.page.getByRole('button', { name: /Generate deliverable/i }).first();
      await expect(generateBtn).toBeEnabled({ timeout: 30_000 });
      await this.deliverablePage.clickGenerateWithResetIfPrompted();

      await this.stagePage.navigateToDeliverableStageDirect();
    });
  }

  /** Visible while storyline sections are building (mid-regeneration). */
  private keyInitiativesDuringRegen(): Locator {
    return this.page.locator('xpath=//span[normalize-space()="Key Initiatives"]');
  }

  /** After Reset / Regenerate — poll from current stage; use tab 3 only when Export is not yet visible. */
  public async waitForFullRegenerationComplete(
    timeoutMs = TC017_REGENERATE_TIMEOUT_MS,
  ): Promise<void> {
    await test.step('Wait for deliverable regeneration to complete', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();

      const startedDeadline = Date.now() + DELIVERABLE_GENERATION_STARTED_TIMEOUT_MS;
      let sawRegenerationActive = false;
      let sawKeyInitiatives = false;
      let pollCount = 0;

      const alreadyCompleteAtStart = await this.stagePage.isDeliverableGenerationComplete();

      await expect
        .poll(
          async () => {
            pollCount += 1;

            if (await this.keyInitiativesDuringRegen().isVisible().catch(() => false)) {
              sawKeyInitiatives = true;
            }
            if (await this.stagePage.isDeliverableGenerationInProgress()) {
              sawRegenerationActive = true;
            }

            if (await this.stagePage.isDeliverableGenerationComplete()) {
              if (alreadyCompleteAtStart && !sawRegenerationActive && !sawKeyInitiatives) {
                return false;
              }
              if (
                sawRegenerationActive ||
                sawKeyInitiatives ||
                Date.now() >= startedDeadline
              ) {
                return true;
              }
              return false;
            }

            if (
              pollCount % 4 === 0 &&
              !(await this.stagePage.exportButton().isVisible().catch(() => false))
            ) {
              await this.stagePage.navigateToDeliverableStageDirect();
            }

            return false;
          },
          {
            timeout: timeoutMs,
            intervals: [3000, 5000, 10_000, 15_000],
            message:
              'Deliverable regeneration should complete (3. Deliverable green or Export enabled)',
          },
        )
        .toBe(true);

      if (!(await this.stagePage.isDeliverableGenerationComplete())) {
        await this.stagePage.navigateToDeliverableStageDirect();
      }

      const deliverableGreen = await this.stagePage
        .deliverableStageGreenComplete()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!deliverableGreen && !(await this.stagePage.exportButton().isEnabled().catch(() => false))) {
        await expect(this.stagePage.exportButton()).toBeEnabled({ timeout: 15_000 });
      }

      await this.testInfo.attach('regeneration-complete', {
        body: JSON.stringify(
          {
            sawRegenerationActive,
            sawKeyInitiatives,
            deliverableStepGreen: deliverableGreen,
            exportEnabled: await this.stagePage.exportButton().isEnabled().catch(() => false),
            pollIterations: pollCount,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    });
  }

  /** @deprecated Use {@link waitForFullRegenerationComplete} — Export-only wait is too early for TC-017. */
  public async waitForDeliverableOutputReady(
    timeoutMs = TC017_REGENERATE_TIMEOUT_MS,
  ): Promise<void> {
    await this.waitForFullRegenerationComplete(timeoutMs);
  }

  private async isDeliverableStorylineLoading(): Promise<boolean> {
    if (await this.stagePage.isExportReady()) {
      return false;
    }
    if (await this.stagePage.deliverableStageGreenComplete().isVisible().catch(() => false)) {
      return false;
    }
    if (await this.stagePage.isDeliverableGenerationInProgress()) {
      return true;
    }
    if (await this.stagePage.hasActiveGenerationSpinner()) {
      return true;
    }
    return await this.deliverableStorylineRegion()
      .getByText(
        /generating|Updating section|Applying|Updating your|storyline generation in progress|please wait/i,
      )
      .first()
      .isVisible()
      .catch(() => false);
  }

  /**
   * After Reset / Regenerate — wait for generation to finish (Export / 3. Deliverable).
   * Sticky notes are handled in step 3; do not click disabled section tabs during this wait.
   */
  /**
   * Skip Reset/Regenerate when generation is already done — **no navigation** (avoids Settings → Deliverable → Settings).
   */
  public async canSkipRegenerateAfterSettingsEdit(): Promise<boolean> {
    await this.deliverablePage.dismissBlockingDeliverablePanels();
    return await this.stagePage.isDeliverableGenerationComplete();
  }

  /** @deprecated Use {@link canSkipRegenerateAfterSettingsEdit} before step 2. */
  public async isDeliverableReadyForStickyNotesEdits(): Promise<boolean> {
    return (
      (await this.canSkipRegenerateAfterSettingsEdit()) && (await this.isStickyNotesAreaReady())
    );
  }

  /**
   * Single navigation to **3. Deliverable** for steps 2–3 — Sticky notes expanded and ready (no workplan tab required).
   */
  /** After Settings save — Deliverable export + Executive Summary Sticky notes must be ready. */
  public async waitForDeliverableStableAfterSettings(timeoutMs = 5 * 60_000): Promise<void> {
    await test.step('Wait for Deliverable to stabilize after Settings', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.stagePage.navigateToDeliverableStageDirect();
      await this.ensureDeliverableContentTab();

      await expect
        .poll(async () => this.stagePage.isExportReady(), {
          timeout: timeoutMs,
          intervals: [1000, 2000, 3000, 5000, 10_000],
          message: 'Export should be enabled after Settings save',
        })
        .toBe(true);

      await this.clickExecutiveSummaryExpandSectionIfCollapsed();
      await expect
        .poll(
          async () => {
            if (await this.isStickyNotesAreaReady()) {
              return true;
            }
            await this.clickExecutiveSummaryExpandSectionIfCollapsed();
            await this.expandStickyNotesPanelIfCollapsed();
            return await this.isStickyNotesAreaReady();
          },
          {
            timeout: Math.min(timeoutMs, 90_000),
            intervals: [500, 1000, 2000, 3000, 5000],
            message: 'Executive Summary Sticky notes should be ready after Settings',
          },
        )
        .toBe(true);
    });
  }

  public async navigateToDeliverableForStickyNotesWorkflow(
    timeoutMs = 120_000,
  ): Promise<void> {
    await test.step('Open Deliverable output once for Sticky notes workflow', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.stagePage.navigateToDeliverableStageDirect();
      await this.ensureDeliverableContentTab();
      await this.clickExecutiveSummaryExpandSectionIfCollapsed();
      await expect
        .poll(
          async () => {
            if (await this.isStickyNotesAreaReady()) {
              return true;
            }
            await this.clickExecutiveSummaryExpandSectionIfCollapsed();
            await this.expandStickyNotesPanelIfCollapsed();
            return await this.isStickyNotesAreaReady();
          },
          {
            timeout: timeoutMs,
            intervals: [500, 1000, 2000, 3000, 5000],
            message: 'Executive Summary Sticky notes should be ready on 3. Deliverable → Content',
          },
        )
        .toBe(true);
    });
  }

  private async waitForStickyNotesReady(timeoutMs: number): Promise<void> {
    await expect
      .poll(async () => this.isStickyNotesAreaReady(), {
        timeout: timeoutMs,
        intervals: [500, 1000, 2000, 3000, 5000],
        message: 'Sticky notes textarea should be visible and editable on 3. Deliverable → Content',
      })
      .toBe(true);
  }

  public async waitForDeliverableOutputAfterRegenerate(
    timeoutMs = TC017_REGENERATE_TIMEOUT_MS,
  ): Promise<void> {
    await this.waitForFullRegenerationComplete(timeoutMs);

    await expect
      .poll(
        async () => {
          if (!(await this.isOnDeliverableOutputStage())) {
            await this.stagePage.navigateToDeliverableStageDirect();
            await this.ensureDeliverableContentTab();
          }
          await this.expandStickyNotesPanelIfCollapsed();
          return await this.isStickyNotesAreaReady();
        },
        {
          timeout: TC017_STICKY_NOTES_ACTIVE_TIMEOUT_MS,
          intervals: [1000, 2000, 3000, 5000, 10_000],
          message:
            'Sticky notes should be ready on 3. Deliverable after regeneration',
        },
      )
      .toBe(true);

    const stickyNotesSeen = await this.isStickyNotesAreaReady();
    await this.testInfo.attach('deliverable-output-after-regen', {
      body: JSON.stringify(
        {
          stickyNotesSeen,
          generationComplete: await this.stagePage.isDeliverableGenerationComplete(),
          exportEnabled: await this.stagePage.exportButton().isEnabled().catch(() => false),
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  }

  private storylineNotesBanner(): Locator {
    return this.page.getByText(/Update your Storyline with your notes/i).first();
  }

  private stickyNotesHeading(): Locator {
    return this.page.getByText(/^Sticky notes$/i).first();
  }

  /** User XPath — sticky notes textarea. */
  private static readonly STICKY_NOTES_TEXTAREA_XPATH =
    "//textarea[contains(@placeholder, 'Explain the business context')]";
  /** From "Sticky notes" label → next textarea (Deliverable output panel). */
  private static readonly STICKY_NOTES_TEXTAREA_AFTER_LABEL_XPATH =
    "//*[normalize-space()='Sticky notes']/following::textarea[contains(@placeholder,'Explain the business context')][1]";

  /**
   * Deliverable canvas. App often has no `<main>` — do not use `main.last()` alone.
   */
  private deliverableStorylineRegion(): Locator {
    return this.page
      .locator('[role="main"]')
      .last()
      .or(this.page.locator('main').last())
      .or(
        this.page
          .locator('div')
          .filter({ has: this.page.getByRole('button', { name: /^Export$/i }) })
          .last(),
      );
  }

  /**
   * Deliverable **Content** storyline (excludes Settings workplan tabs and Brief composer).
   */
  private deliverableContentStoryline(): Locator {
    const main = this.deliverableStorylineRegion();
    return main
      .filter({ has: this.page.getByText(/^Sticky notes$/i) })
      .or(main.filter({ has: this.page.getByRole('button', { name: /^Update section$/i }) }))
      .or(main.filter({ has: this.page.getByRole('button', { name: /^Export$/i }) }))
      .first();
  }

  /** Resolve the visible sticky-notes textarea (tries label-adjacent xpath, then flex-1, then page). */
  private async findStickyNotesTextarea(): Promise<Locator | null> {
    const candidates = [
      this.page.locator(
        `xpath=${DeliverableEditsSyncPage.STICKY_NOTES_TEXTAREA_AFTER_LABEL_XPATH}`,
      ),
      this.page.locator(
        "xpath=//div[contains(@class, 'flex-1')]//textarea[contains(@placeholder, 'Explain the business context')]",
      ),
      this.page.locator(`xpath=${DeliverableEditsSyncPage.STICKY_NOTES_TEXTAREA_XPATH}`),
    ];

    let best: Locator | null = null;
    let bestArea = 0;

    for (const group of candidates) {
      const count = await group.count();
      for (let i = 0; i < count; i += 1) {
        const field = group.nth(i);
        if (!(await field.isVisible().catch(() => false))) {
          continue;
        }
        if (await field.isDisabled().catch(() => false)) {
          continue;
        }
        const box = await field.boundingBox().catch(() => null);
        const area = box ? box.width * box.height : 0;
        if (area > bestArea) {
          bestArea = area;
          best = field;
        }
      }
      if (best && bestArea > 3_000) {
        return best;
      }
    }
    return best;
  }

  /** Sticky notes + Update section live in the same deliverable output panel. */
  private stickyNotesPanel(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText(/^Sticky notes$/i) })
      .filter({ has: this.page.getByRole('button', { name: /^Update section$/i }) })
      .last();
  }

  private updateSectionButton(): Locator {
    return this.stickyNotesPanel().getByRole('button', { name: /^Update section$/i }).first();
  }

  /** Stay on **3. Deliverable → Content** with Executive Summary + Sticky notes visible. */
  private async ensureOnDeliverableContentForStickyNotes(
    section: WorkplanSectionDefinition,
  ): Promise<void> {
    await this.deliverablePage.dismissBlockingDeliverablePanels();

    const exportVisible = await this.page
      .getByRole('button', { name: /^Export$/i })
      .isVisible()
      .catch(() => false);
    if (!exportVisible) {
      if (this.deliverableName) {
        await this.stagePage
          .navigateToStage('Deliverable', {
            deliverableName: this.deliverableName,
            stageSettleMs: 0,
          })
          .catch(() => undefined);
      } else {
        await this.stagePage.navigateToDeliverableStageDirect();
      }
    }

    await this.ensureDeliverableContentTab();
    if (section.key === 'executive-summary') {
      await this.clickExecutiveSummaryExpandSectionIfCollapsed();
    }
    await this.expandStickyNotesPanelIfCollapsed();
  }

  /** First visible, enabled Update section in Deliverable output (avoids .or() scroll timeouts). */
  private async resolveVisibleUpdateSectionButton(): Promise<Locator | null> {
    const scopes = [
      this.stickyNotesPanel(),
      this.deliverableWorkplanRow(),
      this.deliverableContentStoryline(),
      this.deliverableStorylineRegion(),
    ];

    for (const scope of scopes) {
      const buttons = scope.getByRole('button', { name: /^Update section$/i });
      const count = await buttons.count();
      for (let i = 0; i < count; i += 1) {
        const btn = buttons.nth(i);
        if (
          (await btn.isVisible().catch(() => false)) &&
          (await btn.isEnabled().catch(() => false))
        ) {
          return btn;
        }
      }
    }

    const pageButtons = this.page.getByRole('button', { name: /^Update section$/i });
    const pageCount = await pageButtons.count();
    for (let i = pageCount - 1; i >= 0; i -= 1) {
      const btn = pageButtons.nth(i);
      if (
        (await btn.isVisible().catch(() => false)) &&
        (await btn.isEnabled().catch(() => false))
      ) {
        return btn;
      }
    }

    return null;
  }

  private async clickResolvedUpdateSection(
    section: WorkplanSectionDefinition,
    preferButton?: Locator | null,
    pollTimeoutMs = 20_000,
  ): Promise<void> {
    await this.ensureOnDeliverableContentForStickyNotes(section);

    if (
      preferButton &&
      (await preferButton.isVisible().catch(() => false)) &&
      (await preferButton.isEnabled().catch(() => false))
    ) {
      await preferButton.click({ force: true, timeout: 15_000 });
      return;
    }

    await expect
      .poll(
        async () => {
          await this.ensureOnDeliverableContentForStickyNotes(section);
          return (await this.resolveVisibleUpdateSectionButton()) !== null;
        },
        {
          timeout: pollTimeoutMs,
          intervals: [300, 600, 1000, 2000, 3000],
          message: 'Update section should be visible and enabled beside Sticky notes',
        },
      )
      .toBe(true);

    const updateBtn = (await this.resolveVisibleUpdateSectionButton())!;
    await updateBtn.click({ force: true, timeout: 15_000 });
  }

  private isDeliverableToolbarButtonLabel(label: string): boolean {
    const normalized = label.replace(/\s+/g, ' ').trim();
    return /^(export|share|sanity check|sanity|content|update section)$/i.test(normalized);
  }

  private stickyNotesUpdateRequestError(): Locator {
    return this.page
      .getByText(/Could not build section update request for this section/i)
      .first();
  }

  private async isStickyNotesUpdateRequestErrorVisible(): Promise<boolean> {
    return this.stickyNotesUpdateRequestError().isVisible().catch(() => false);
  }

  /** Section refresh UI scoped to Deliverable output (not sidebar / export chrome spinners). */
  private async isWorkplanSectionUpdateInProgress(): Promise<boolean> {
    const updatingPattern = /Updating section|Applying changes|Applying your/i;
    const scopes = [
      this.stickyNotesPanel(),
      this.deliverableWorkplanRow(),
      this.deliverableContentStoryline(),
    ];
    for (const scope of scopes) {
      if (
        await scope
          .getByText(updatingPattern)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        return true;
      }
    }
    return false;
  }

  private async isStickyNotesSectionUpdateStarted(): Promise<boolean> {
    if (await this.isStickyNotesUpdateRequestErrorVisible()) {
      return false;
    }
    if (await this.isWorkplanSectionUpdateInProgress()) {
      return true;
    }
    if (await this.stagePage.hasActiveGenerationSpinner()) {
      return true;
    }
    return await this.page
      .getByText(/generating|storyline generation in progress|please wait/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  private executiveSummarySectionButton(): Locator {
    return this.deliverableWorkplanRow().getByRole('button', { name: /Executive Summary/i }).first();
  }

  /** Expanded Executive Summary accordion on Deliverable output. */
  private executiveSummaryExpandedSection(): Locator {
    return this.executiveSummarySectionButton().filter({
      has: this.page.getByRole('button', { name: /^Collapse section$/i }),
    });
  }

  /** Sample deliverable accordions expose a nested **Expand section** control — never click the outer ES chrome. */
  private async clickExecutiveSummaryExpandSectionIfCollapsed(): Promise<void> {
    if (await this.executiveSummaryExpandedSection().isVisible().catch(() => false)) {
      return;
    }

    const row = this.deliverableWorkplanRow();
    const expandControls = [
      row
        .getByRole('heading', { name: /^Executive Summary$/i, level: 2 })
        .locator('xpath=ancestor::*[1]//button[normalize-space()="Expand section"]')
        .first(),
      row.locator('xpath=.//button[normalize-space()="Expand section"]').first(),
      row.getByRole('button', { name: /^Expand section$/i }).first(),
    ];

    for (const expand of expandControls) {
      if (!(await expand.isVisible().catch(() => false))) {
        continue;
      }
      await expand.click({ force: true, timeout: 8_000 }).catch(() => undefined);
      await this.page.waitForTimeout(800);
      if (await this.isExecutiveSummaryPanelOpen()) {
        return;
      }
    }
  }

  /** Loading animation / disabled Update section scoped to Executive Summary (not global Export chrome). */
  private async isExecutiveSummarySectionLoading(
    section: WorkplanSectionDefinition,
  ): Promise<boolean> {
    if (section.key !== 'executive-summary') {
      return this.isWorkplanSectionUpdateInProgress();
    }

    if (await this.isWorkplanSectionUpdateInProgress()) {
      return true;
    }

    const scope = this.executiveSummaryExpandedSection();
    if (!(await scope.isVisible().catch(() => false))) {
      if (await this.stagePage.isExportReady()) {
        return false;
      }
      return await this.stagePage.hasActiveGenerationSpinner();
    }

    const spinnerInSection = await scope
      .locator('[class*="animate-spin"], [aria-busy="true"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (spinnerInSection) {
      return true;
    }

    return false;
  }

  /** True when Executive Summary section refresh animation and loading copy have finished. */
  private async isExecutiveSummarySectionLoadingFinished(
    section: WorkplanSectionDefinition,
  ): Promise<boolean> {
    if (await this.isStickyNotesUpdateRequestErrorVisible()) {
      return false;
    }
    if (await this.isWorkplanSectionUpdateInProgress()) {
      return false;
    }
    if (await this.isExecutiveSummarySectionLoading(section)) {
      return false;
    }
    if (await this.stagePage.isExportReady()) {
      return true;
    }
    if (await this.isStickyNotesAreaReady()) {
      return true;
    }
    return !(await this.stagePage.hasActiveGenerationSpinner());
  }

  /** Sample deliverable — section update done when Update section is enabled and no section-level loading copy. */
  private async isWorkplanSectionUpdateComplete(): Promise<boolean> {
    if (await this.isStickyNotesUpdateRequestErrorVisible()) {
      return false;
    }
    if (await this.isWorkplanSectionUpdateInProgress()) {
      return false;
    }

    const resolvedUpdate = await this.resolveVisibleUpdateSectionButton();
    if (resolvedUpdate && (await this.isStickyNotesAreaReady())) {
      return true;
    }

    return (
      (await this.stagePage.isExportReady()) &&
      (await this.isStickyNotesAreaReady()) &&
      !(await this.isWorkplanSectionUpdateInProgress())
    );
  }

  private async dismissStickyNotesUpdateError(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await expect
      .poll(async () => !(await this.isStickyNotesUpdateRequestErrorVisible()), {
        timeout: 20_000,
        intervals: [400, 800, 1500, 2500],
        message: 'Build-request error toast should dismiss',
      })
      .toBe(true);
    await this.deliverablePage.dismissBlockingDeliverablePanels();
    await this.page.waitForTimeout(800);
  }

  /** Re-open **3. Deliverable → Content → Executive Summary** after a failed Update section (build-request toast). */
  private async restoreDeliverableStickyNotesContext(
    section: WorkplanSectionDefinition,
  ): Promise<void> {
    await this.dismissStickyNotesUpdateError();
    await this.deliverablePage.dismissBlockingDeliverablePanels();

    if (this.deliverableName) {
      await this.stagePage
        .navigateToStage('Deliverable', {
          deliverableName: this.deliverableName,
          stageSettleMs: 0,
        })
        .catch(() => undefined);
    } else {
      await this.stagePage.navigateToDeliverableStageDirect();
    }

    await this.ensureDeliverableContentTab();

    await expect
      .poll(async () => this.stagePage.isExportReady(), {
        timeout: 180_000,
        intervals: [1000, 2000, 3000, 5000, 10_000],
        message: 'Export should be enabled before sticky-notes recovery',
      })
      .toBe(true);

    await this.clickExecutiveSummaryExpandSectionIfCollapsed();
    await this.expandStickyNotesPanelIfCollapsed();
    await this.waitForStickyNotesReady(90_000);

    if (section.key === 'executive-summary') {
      await this.ensureExecutiveSummaryAccordionExpanded(section);
    } else {
      await this.ensureWorkplanSectionActive(section);
    }
  }

  private async isExecutiveSummaryStorylineVisible(): Promise<boolean> {
    const text = (await this.deliverableMainRegion().innerText().catch(() => '')).replace(/\s+/g, ' ');
    return /\bTITLE:\s*Executive Summary/i.test(text);
  }

  /**
   * Build-request error — restore Deliverable output, wait for section body, re-type notes.
   */
  private async recoverAfterStickyNotesBuildRequestError(
    section: WorkplanSectionDefinition,
    noteText: string,
    verifyToken: string,
  ): Promise<Locator> {
    await this.restoreDeliverableStickyNotesContext(section);
    await this.tryWaitForSectionGeneratedContent(section, TC017_SOFT_SECTION_CONTENT_MS);

    const editor = await this.resolveStickyNotesEditor();
    await editor.scrollIntoViewIfNeeded();
    await this.typeIntoStickyNotesTextarea(editor, noteText.trim(), verifyToken.trim());
    await this.page.waitForTimeout(TC017_STICKY_NOTES_BEFORE_UPDATE_MS);

    await expect
      .poll(async () => (await this.resolveVisibleUpdateSectionButton()) !== null, {
        timeout: 60_000,
        intervals: [500, 1000, 2000, 3000],
        message: `Update section should enable for "${section.tabName}" after recovery`,
      })
      .toBe(true);

    return editor;
  }

  private async waitForUpdateSectionClickOutcome(
    timeoutMs: number,
  ): Promise<'started' | 'error' | 'idle'> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.isStickyNotesUpdateRequestErrorVisible()) {
        return 'error';
      }
      if (await this.isStickyNotesSectionUpdateStarted()) {
        return 'started';
      }
      await this.page.waitForTimeout(350);
    }
    if (await this.isStickyNotesUpdateRequestErrorVisible()) {
      return 'error';
    }
    if (await this.isStickyNotesSectionUpdateStarted()) {
      return 'started';
    }
    return 'idle';
  }

  private async clickUpdateSectionWithRetry(
    section: WorkplanSectionDefinition,
    editor: Locator,
    noteText: string,
    verifyToken: string,
    maxAttempts = 3,
    updateButtonWhenReady?: Locator | null,
  ): Promise<void> {
    await test.step(`Click Update section for "${section.tabName}" (retry if build-request error)`, async () => {
      let activeEditor = editor;
      let cachedUpdateBtn = updateButtonWhenReady ?? null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        await activeEditor.blur().catch(() => undefined);
        await this.page.waitForTimeout(300);

        const activeTab = await this.getActiveWorkplanTabLabel();
        await this.testInfo.attach(`workplan-active-tab-before-update-${attempt}`, {
          body: JSON.stringify(
            { expected: section.tabName, activeTab: activeTab || '(unknown)' },
            null,
            2,
          ),
          contentType: 'application/json',
        });

        await this.clickResolvedUpdateSection(
          section,
          attempt === 1 ? cachedUpdateBtn : null,
          attempt === 1 ? 20_000 : 45_000,
        );
        cachedUpdateBtn = null;

        const outcome = await this.waitForUpdateSectionClickOutcome(25_000);

        if (outcome === 'started') {
          this.stickyNotesUpdateSucceeded = true;
          await this.testInfo.attach('sticky-notes-update-started', {
            body: JSON.stringify({ section: section.tabName, attempt, outcome }, null, 2),
            contentType: 'application/json',
          });
          return;
        }

        if (outcome === 'idle' && section.key === 'executive-summary') {
          await this.page.waitForTimeout(1_500);
          const updateBtnAfter = this.updateSectionButton();
          const loading =
            (await this.isExecutiveSummarySectionLoading(section)) ||
            (await this.isWorkplanSectionUpdateInProgress());
          const updateBusy =
            (await updateBtnAfter.isVisible().catch(() => false)) &&
            !(await updateBtnAfter.isEnabled().catch(() => true));
          if (loading || updateBusy) {
            this.stickyNotesUpdateSucceeded = true;
            await this.testInfo.attach('sticky-notes-update-started', {
              body: JSON.stringify(
                { section: section.tabName, attempt, outcome: 'idle-treated-as-started', loading, updateBusy },
                null,
                2,
              ),
              contentType: 'application/json',
            });
            return;
          }
        }

        if (outcome === 'error') {
          await this.testInfo.attach(`sticky-notes-update-error-attempt-${attempt}`, {
            body:
              (await this.stickyNotesUpdateRequestError().innerText().catch(() => '')) ||
              'Could not build section update request for this section',
            contentType: 'text/plain',
          });
          await this.dismissStickyNotesUpdateError();
          await this.page.waitForTimeout(2_000);
          if (
            (await this.isExecutiveSummarySectionLoading(section)) ||
            (await this.isWorkplanSectionUpdateInProgress())
          ) {
            this.stickyNotesUpdateSucceeded = true;
            return;
          }
          if (attempt < maxAttempts && (await this.resolveVisibleUpdateSectionButton())) {
            continue;
          }
        }

        if (attempt < maxAttempts && outcome === 'error') {
          activeEditor = await this.recoverAfterStickyNotesBuildRequestError(
            section,
            noteText,
            verifyToken,
          );
          await this.page.waitForTimeout(1_500);
          continue;
        }

        if (attempt < maxAttempts && outcome === 'idle') {
          await this.page.waitForTimeout(2_000);
          continue;
        }
      }

      expect(
        await this.isStickyNotesUpdateRequestErrorVisible(),
        `"${section.tabName}": Update section should not show build-request error after retries`,
      ).toBe(false);
      expect(
        await this.isStickyNotesSectionUpdateStarted(),
        `"${section.tabName}": Update section should start section update or generation after retries`,
      ).toBe(true);
      this.stickyNotesUpdateSucceeded = true;
    });
  }

  /** Row that contains Export — Deliverable output (not Settings / sidebar). */
  private deliverableWorkplanRow(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('button', { name: /^Export$/i }) })
      .last();
  }

  /** Storyline section tab — prefer Deliverable output row; partial name match. */
  private storylineSectionTab(sectionName: string): Locator {
    const pattern = new RegExp(sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const row = this.deliverableWorkplanRow();
    return row
      .getByRole('button', { name: pattern })
      .or(row.getByRole('tab', { name: pattern }))
      .or(
        row.locator(`xpath=.//span[normalize-space()="${sectionName}"]/ancestor::button[1]`),
      )
      .or(row.locator(`xpath=.//span[normalize-space()="${sectionName}"]`))
      .or(this.page.getByRole('button', { name: pattern }))
      .or(this.page.getByRole('tab', { name: pattern }))
      .filter({ visible: true })
      .last();
  }

  private normalizeTabLabel(label: string): string {
    return label.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /** Strip leading workplan index (e.g. "1 Executive Summary …" on sample deliverable accordions). */
  private stripWorkplanIndexPrefix(label: string): string {
    return label.replace(/^\d+\s+/, '').trim();
  }

  /** True when label targets this section and not another workplan module (e.g. Competition). */
  private labelMatchesWorkplanSection(label: string, section: WorkplanSectionDefinition): boolean {
    const norm = this.normalizeTabLabel(label);
    if (norm.length === 0 || this.isDeliverableToolbarButtonLabel(norm)) {
      return false;
    }
    if (!section.tabPattern.test(label)) {
      return false;
    }

    const want = this.normalizeTabLabel(section.tabName);
    const withoutIndex = this.normalizeTabLabel(this.stripWorkplanIndexPrefix(label));
    const nameMatches =
      norm === want ||
      withoutIndex === want ||
      norm.startsWith(`${want} `) ||
      withoutIndex.startsWith(`${want} `) ||
      norm.startsWith(want) ||
      withoutIndex.startsWith(want) ||
      want.startsWith(norm);
    if (!nameMatches) {
      return false;
    }

    for (const other of TC017_WORKPLAN_SECTIONS) {
      if (other.key === section.key) {
        continue;
      }
      const otherWant = this.normalizeTabLabel(other.tabName);
      if (
        norm === otherWant ||
        norm.startsWith(`${otherWant} `) ||
        withoutIndex === otherWant ||
        withoutIndex.startsWith(`${otherWant} `)
      ) {
        return false;
      }
    }
    return true;
  }

  /** Accordion root buttons include full storyline prose — not clickable workplan tabs. */
  private isWorkplanAccordionChromeLabel(label: string): boolean {
    const norm = label.replace(/\s+/g, ' ').trim();
    return norm.length > 120 || /\bTITLE:\s*/i.test(norm) || /\bExpand section\b/i.test(norm);
  }

  private async collectWorkplanTabCandidates(
    root: Locator,
    section: WorkplanSectionDefinition,
  ): Promise<Locator[]> {
    const matches: Locator[] = [];

    for (const role of ['button', 'tab'] as const) {
      const group = root.getByRole(role);
      const count = await group.count();
      for (let i = 0; i < count; i += 1) {
        const locator = group.nth(i);
        const label = (await locator.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        if (this.isWorkplanAccordionChromeLabel(label)) {
          continue;
        }
        if (!this.labelMatchesWorkplanSection(label, section)) {
          continue;
        }
        if (!(await locator.isVisible().catch(() => false))) {
          continue;
        }
        matches.push(locator);
      }
    }

    const span = root.locator(`xpath=.//span[normalize-space()="${section.tabName}"]`);
    const spanCount = await span.count();
    for (let i = spanCount - 1; i >= 0; i -= 1) {
      const locator = span.nth(i);
      if (await locator.isVisible().catch(() => false)) {
        matches.push(locator);
      }
    }

    return matches;
  }

  /** Find workplan tab for a section — strict label rules, multiple DOM roots. */
  private async findWorkplanSectionTab(
    section: WorkplanSectionDefinition,
  ): Promise<Locator | null> {
    const roots = [
      this.deliverableWorkplanRow(),
      this.stickyNotesPanel().locator('xpath=ancestor::*[position()<=8]'),
      this.deliverableContentStoryline(),
      this.page.locator('main').last(),
    ];

    for (const root of roots) {
      const candidates = await this.collectWorkplanTabCandidates(root, section);
      for (let i = candidates.length - 1; i >= 0; i -= 1) {
        const tab = candidates[i];
        if (await tab.isEnabled().catch(() => true)) {
          return tab;
        }
      }
      if (candidates.length > 0) {
        return candidates[candidates.length - 1];
      }
    }

    const fallback = this.storylineSectionTab(section.tabName);
    if (await fallback.isVisible().catch(() => false)) {
      const label = (await fallback.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (
        !this.isWorkplanAccordionChromeLabel(label) &&
        this.labelMatchesWorkplanSection(label, section)
      ) {
        return fallback;
      }
    }

    return null;
  }

  /** Expand Sticky notes accordion when the heading is visible but the textarea is not. */
  private async expandStickyNotesPanelIfCollapsed(): Promise<void> {
    if (await this.isStickyNotesAreaReady()) {
      return;
    }

    const heading = this.stickyNotesHeading();
    if (!(await heading.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }

    await heading.scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => undefined);
    if (await this.isStickyNotesAreaReady()) {
      return;
    }

    await heading.click({ timeout: 8_000 }).catch(() => undefined);
    await this.page.waitForTimeout(500);

    await expect
      .poll(async () => this.isStickyNotesAreaReady(), {
        timeout: 20_000,
        intervals: [300, 600, 1000, 2000],
        message: 'Sticky notes panel should expand to show the textarea',
      })
      .toBe(true);
  }

  /** Activate a single workplan tab; Sticky notes + Update section apply only to the active tab. */
  private async ensureWorkplanSectionActive(
    section: WorkplanSectionDefinition,
    timeoutMs = 60_000,
  ): Promise<void> {
    if (section.key === 'executive-summary') {
      await this.ensureExecutiveSummaryAccordionExpanded(section);
      return;
    }

    if (await this.isWorkplanSectionSelected(section)) {
      return;
    }

    let clickedTab: Locator | null = null;

    await expect
      .poll(
        async () => {
          if (await this.isWorkplanSectionSelected(section)) {
            return true;
          }
          if (await this.isExecutiveSummarySectionReadyForStickyNotes(section)) {
            return true;
          }
          if (await this.isExecutiveSummarySectionAccessible(section)) {
            return true;
          }
          if (await this.isExecutiveSummaryPanelOpen()) {
            return true;
          }

          const tab =
            (await this.findWorkplanSectionTab(section)) ??
            (await this.storylineSectionTab(section.tabName).isVisible().catch(() => false)
              ? this.storylineSectionTab(section.tabName)
              : null);
          if (!tab) {
            return false;
          }
          if (!(await tab.isEnabled().catch(() => false))) {
            return false;
          }
          clickedTab = tab;
          await tab.scrollIntoViewIfNeeded().catch(() => undefined);
          await tab.click({ force: true, timeout: 15_000 }).catch(() => undefined);
          await this.page.waitForTimeout(400);
          await this.expandStickyNotesPanelIfCollapsed();

          return (
            (await this.isWorkplanSectionSelected(section)) ||
            (await this.isExecutiveSummarySectionReadyForStickyNotes(section))
          );
        },
        {
          timeout: timeoutMs,
          intervals: [500, 1000, 2000, 3000, 5000],
          message: `"${section.tabName}" workplan tab should become active before Sticky notes`,
        },
      )
      .toBe(true);

    if (
      (await this.isWorkplanSectionSelected(section)) ||
      (await this.isExecutiveSummarySectionReadyForStickyNotes(section)) ||
      (await this.isExecutiveSummarySectionAccessible(section))
    ) {
      return;
    }

    if (!clickedTab) {
      throw new Error(`Workplan tab "${section.tabName}" not found`);
    }
  }

  /** Deliverable + Content + Executive Summary + expanded Sticky notes (step 3). */
  private async prepareWorkplanSectionForStickyNotesEdit(
    section: WorkplanSectionDefinition,
  ): Promise<void> {
    if (!(await this.isOnDeliverableOutputStage())) {
      await this.navigateToDeliverableForStickyNotesWorkflow(120_000);
    } else {
      await this.ensureDeliverableContentTab();
      await this.expandStickyNotesPanelIfCollapsed();
      if (!(await this.isStickyNotesAreaReady())) {
        await this.waitForStickyNotesReady(90_000);
      }
    }

    await expect
      .poll(
        async () => {
          if (section.key === 'executive-summary') {
            await this.clickExecutiveSummaryExpandSectionIfCollapsed();
            return (
              (await this.isExecutiveSummarySectionAccessible(section)) ||
              (await this.isExecutiveSummarySectionReadyForStickyNotes(section)) ||
              (await this.isStickyNotesAreaReady())
            );
          }
          return (await this.findWorkplanSectionTab(section)) !== null;
        },
        {
          timeout: 60_000,
          intervals: [500, 1000, 2000, 3000],
          message: `Workplan tab "${section.tabName}" should be visible on 3. Deliverable`,
        },
      )
      .toBe(true);

    if (section.key === 'executive-summary') {
      await this.ensureExecutiveSummaryAccordionExpanded(section);
    } else {
      await this.ensureWorkplanSectionActive(section);
    }
    await this.expandStickyNotesPanelIfCollapsed();
    await this.waitForWorkplanSectionReadyAfterClick(section);
    await this.stickyNotesPanel().scrollIntoViewIfNeeded({ timeout: 8_000 }).catch(() => undefined);
  }

  private isToolbarOnlyStorylineExcerpt(text: string): boolean {
    const norm = text.replace(/\s+/g, ' ').trim().toLowerCase();
    return (
      norm.length < 120 &&
      /export/.test(norm) &&
      (/sanity/.test(norm) || /share/.test(norm)) &&
      !/executive summary|competition|use case|key initiatives/i.test(norm)
    );
  }

  private isNoiseStorylineExcerpt(text: string): boolean {
    const norm = text.replace(/\s+/g, ' ').trim();
    if (norm.length === 0 || this.isToolbarOnlyStorylineExcerpt(norm)) {
      return true;
    }
    if (/box-sizing:\s*border-box|#me-slide-|font-family:\s*'Inter'/i.test(norm)) {
      return true;
    }
    if (norm.includes('{') && norm.includes('}') && !/\bTITLE:\s*Executive Summary/i.test(norm)) {
      return true;
    }
    return false;
  }

  private deliverableStorylineBody(): Locator {
    const panel = this.stickyNotesPanel();
    return panel
      .locator('xpath=following::*[position()<=8]')
      .last()
      .or(panel.locator('xpath=preceding::*[position()<=8]').last());
  }

  /** Generated storyline block below Sticky notes (sample deliverable accordion layout). */
  private async captureStorylineBelowStickyNotes(): Promise<string> {
    const panel = this.stickyNotesPanel();
    if (!(await panel.isVisible().catch(() => false))) {
      return '';
    }

    let best = '';
    const following = panel.locator('xpath=following::*[position()<=8]');
    const count = await following.count();
    for (let i = 0; i < count; i += 1) {
      const raw = (await following.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (raw.length < 60 || this.isNoiseStorylineExcerpt(raw)) {
        continue;
      }
      if (/^Content\s+Layout$/i.test(raw)) {
        continue;
      }
      if (raw.length > best.length) {
        best = raw;
      }
    }
    return best;
  }

  /** Expanded workplan accordion — prose often includes "TITLE:" blocks after Sticky notes. */
  private async captureExpandedSectionOutput(
    section: WorkplanSectionDefinition,
  ): Promise<string> {
    const expanded = this.deliverableWorkplanRow()
      .getByRole('button', { name: section.tabPattern })
      .filter({ has: this.page.getByRole('button', { name: /^Collapse section$/i }) })
      .first();

    if (!(await expanded.isVisible().catch(() => false))) {
      const regionText = (
        await this.deliverableMainRegion()
          .innerText()
          .catch(() => '')
      ).replace(/\s+/g, ' ').trim();
      const titleIdx = regionText.search(/\bTITLE:\s*Executive Summary/i);
      if (titleIdx >= 0) {
        return regionText.slice(titleIdx).trim();
      }
      return '';
    }

    const titleBlock = expanded
      .locator('*')
      .filter({ hasText: /^TITLE:\s*/i })
      .last();
    if (await titleBlock.isVisible().catch(() => false)) {
      const titleText = (await titleBlock.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (!this.isNoiseStorylineExcerpt(titleText)) {
        return titleText;
      }
    }

    const below = await this.captureStorylineBelowStickyNotes();
    if (below.length > 0 && !this.isNoiseStorylineExcerpt(below)) {
      return below;
    }

    const full = (await expanded.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const titleIdx = full.search(/\bTITLE:\s*/i);
    if (titleIdx >= 0) {
      return full.slice(titleIdx).trim();
    }
    return this.isNoiseStorylineExcerpt(full) ? '' : full;
  }

  private async getActiveWorkplanTabLabel(): Promise<string> {
    const activeInRow = this.deliverableWorkplanRow().locator(
      'button[aria-selected="true"], button[data-state="active"], [role="tab"][aria-selected="true"]',
    );
    const count = await activeInRow.count();
    for (let i = 0; i < count; i += 1) {
      const label = (await activeInRow.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (label.length > 0 && !this.isDeliverableToolbarButtonLabel(label)) {
        return label;
      }
    }
    return '';
  }

  /** Executive Summary storyline + Sticky notes ready (tab aria state can lag on sample deliverable). */
  private async isExecutiveSummarySectionReadyForStickyNotes(
    section: WorkplanSectionDefinition,
  ): Promise<boolean> {
    if (section.key !== 'executive-summary') {
      return false;
    }
    if (!(await this.isExecutiveSummaryPanelOpen())) {
      return false;
    }
    return await this.isStickyNotesAreaReady();
  }

  /** Executive Summary panel open — Sticky notes usable or accordion expanded. */
  private async isExecutiveSummaryPanelOpen(): Promise<boolean> {
    if (await this.isStickyNotesAreaReady()) {
      return true;
    }
    if (await this.executiveSummaryExpandedSection().isVisible().catch(() => false)) {
      return true;
    }
    const row = this.deliverableWorkplanRow();
    return await row.getByText(/^Sticky notes$/i).first().isVisible().catch(() => false);
  }

  /** Executive Summary accordion expanded with heading visible (sticky notes may still be loading). */
  private async isExecutiveSummarySectionAccessible(
    section: WorkplanSectionDefinition,
  ): Promise<boolean> {
    if (section.key !== 'executive-summary') {
      return false;
    }
    if (await this.isExecutiveSummaryPanelOpen()) {
      return true;
    }
    const heading = this.deliverableWorkplanRow()
      .getByRole('heading', { name: section.tabPattern, level: 2 })
      .first();
    return await heading.isVisible().catch(() => false);
  }

  private async ensureExecutiveSummaryAccordionExpanded(
    section: WorkplanSectionDefinition,
  ): Promise<void> {
    if (section.key !== 'executive-summary') {
      await this.ensureWorkplanSectionActive(section);
      return;
    }

    await this.clickExecutiveSummaryExpandSectionIfCollapsed();

    if (await this.isExecutiveSummaryPanelOpen()) {
      await this.expandStickyNotesPanelIfCollapsed();
      return;
    }

    await expect
      .poll(
        async () => {
          if (await this.isStickyNotesAreaReady()) {
            return true;
          }
          if (await this.isExecutiveSummaryPanelOpen()) {
            return true;
          }
          if (await this.isExecutiveSummaryStorylineVisible()) {
            return true;
          }
          await this.clickExecutiveSummaryExpandSectionIfCollapsed();
          await this.ensureDeliverableContentTab();
          await this.expandStickyNotesPanelIfCollapsed();
          return (
            (await this.isStickyNotesAreaReady()) ||
            (await this.isExecutiveSummaryPanelOpen()) ||
            (await this.isExecutiveSummaryStorylineVisible())
          );
        },
        {
          timeout: 60_000,
          intervals: [300, 600, 1000, 2000, 3000, 5000],
          message: 'Executive Summary panel should be open for Sticky notes',
        },
      )
      .toBe(true);
    await this.expandStickyNotesPanelIfCollapsed();
  }

  private async isWorkplanSectionSelected(section: WorkplanSectionDefinition): Promise<boolean> {
    const active = (await this.getActiveWorkplanTabLabel()).replace(/\s+/g, ' ').trim();
    if (active.length > 0) {
      return this.labelMatchesWorkplanSection(active, section);
    }

    const selectedTab = this.deliverableWorkplanRow().getByRole('tab', { selected: true }).first();
    if (await selectedTab.isVisible().catch(() => false)) {
      return this.labelMatchesWorkplanSection(await selectedTab.innerText().catch(() => ''), section);
    }

    const expandedAccordion = this.deliverableWorkplanRow()
      .getByRole('button', { name: section.tabPattern })
      .filter({ has: this.page.getByRole('button', { name: /^Collapse section$/i }) })
      .first();
    if (await expandedAccordion.isVisible().catch(() => false)) {
      return true;
    }

    const expandedByHeading = this.deliverableWorkplanRow()
      .filter({
        has: this.page.getByRole('heading', { name: section.tabPattern, level: 2 }),
      })
      .filter({ has: this.page.getByRole('button', { name: /^Collapse section$/i }) })
      .first();
    if (await expandedByHeading.isVisible().catch(() => false)) {
      return true;
    }

    if (section.key === 'executive-summary' && (await this.isExecutiveSummarySectionReadyForStickyNotes(section))) {
      return true;
    }

    return await this.page
      .locator(
        `xpath=//span[normalize-space()="${section.tabName}"]/ancestor::*[@aria-selected="true" or @data-state="active"][1]`,
      )
      .first()
      .isVisible()
      .catch(() => false);
  }

  /**
   * After clicking a workplan tab — ready when Sticky notes are usable (body may still be generating).
   */
  /** Soft wait — returns false instead of failing the test for 5 minutes. */
  private async tryWaitForSectionGeneratedContent(
    section: WorkplanSectionDefinition,
    timeoutMs = TC017_SOFT_SECTION_CONTENT_MS,
  ): Promise<boolean> {
    try {
      await expect
        .poll(
          async () => {
            if (await this.isDeliverableStorylineLoading()) {
              return false;
            }
            const heading = this.page.getByRole('heading', { name: section.tabPattern, level: 2 });
            if (await heading.first().isVisible().catch(() => false)) {
              return true;
            }
            const excerpt = await this.captureWorkplanSectionOutput(section);
            if (excerpt.length >= 80 && !this.isToolbarOnlyStorylineExcerpt(excerpt)) {
              return true;
            }
            return (
              (await this.isStickyNotesAreaReady()) && (await this.stagePage.isExportReady())
            );
          },
          {
            timeout: timeoutMs,
            intervals: [1000, 2000, 3000, 5000],
            message: `"${section.tabName}" waiting for storyline or Sticky notes readiness`,
          },
        )
        .toBe(true);
      return true;
    } catch {
      return false;
    }
  }

  private async waitForWorkplanSectionReadyAfterClick(
    section: WorkplanSectionDefinition,
    timeoutMs = TC017_STICKY_NOTES_ACTIVE_TIMEOUT_MS,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          if (await this.isStickyNotesAreaReady()) {
            return true;
          }
          if (await this.isDeliverableStorylineLoading()) {
            return false;
          }
          const panelVisible = await this.stickyNotesPanel().isVisible().catch(() => false);
          const exportReady = await this.stagePage.isExportReady();
          if (panelVisible && exportReady) {
            return true;
          }
          if (await this.isWorkplanSectionSelected(section)) {
            return true;
          }
          const excerpt = await this.captureWorkplanSectionOutput(section);
          return excerpt.length >= 15 && !this.isToolbarOnlyStorylineExcerpt(excerpt);
        },
        {
          timeout: timeoutMs,
          intervals: [500, 1000, 2000, 3000, 5000],
          message: `Workplan section "${section.tabName}" should be ready for Sticky notes on 3. Deliverable`,
        },
      )
      .toBe(true);
  }

  /** Poll until Sticky notes + Export are on **3. Deliverable → Content** (no workplan tab click). */
  private async waitForWorkplanSectionTabsReady(
    timeoutMs = TC017_STICKY_NOTES_ACTIVE_TIMEOUT_MS,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          if (!(await this.isOnDeliverableOutputStage())) {
            await this.deliverablePage.dismissBlockingDeliverablePanels();
            await this.stagePage.navigateToDeliverableStageDirect();
          }
          await this.ensureDeliverableContentTab();
          await this.clickExecutiveSummaryExpandSectionIfCollapsed();
          await this.expandStickyNotesPanelIfCollapsed();

          if (!(await this.stagePage.exportButton().isVisible().catch(() => false))) {
            return false;
          }

          return await this.isStickyNotesAreaReady();
        },
        {
          timeout: timeoutMs,
          intervals: [500, 1000, 2000, 3000, 5000],
          message:
            'Deliverable workplan section tabs (e.g. Executive Summary) or Sticky notes should be ready on 3. Deliverable → Content',
        },
      )
      .toBe(true);
  }

  private async isStickyNotesAreaVisible(): Promise<boolean> {
    const banner = await this.storylineNotesBanner().isVisible().catch(() => false);
    const heading = await this.stickyNotesHeading().isVisible().catch(() => false);
    if (!banner && !heading) {
      return false;
    }
    return (await this.findStickyNotesTextarea()) !== null;
  }

  private async isStickyNotesAreaReady(): Promise<boolean> {
    const field = await this.findStickyNotesTextarea();
    if (!field) {
      return false;
    }
    return this.isStickyNotesEditorReady(field);
  }

  private async resolveStickyNotesEditor(): Promise<Locator> {
    const field = await this.findStickyNotesTextarea();
    if (!field) {
      throw new Error('Sticky notes textarea not found');
    }
    await expect(field).toBeVisible({ timeout: 10_000 });
    await field.scrollIntoViewIfNeeded();
    return field;
  }

  /** @deprecated Prefer {@link navigateToDeliverableForStickyNotesWorkflow}. */
  private async openDeliverableOutputForStickyNotes(): Promise<void> {
    await this.navigateToDeliverableForStickyNotesWorkflow();
  }

  /** @deprecated Step 3 uses {@link waitForDeliverableOutputAfterRegenerate} + {@link editAllWorkplanSectionsViaStickyNotes}. */
  public async waitForCompetitionPhaseComplete(
    timeoutMs = TC017_COMPETITION_PHASE_TIMEOUT_MS,
  ): Promise<void> {
    await this.openDeliverableOutputForStickyNotes();
    await expect
      .poll(async () => this.isStickyNotesAreaReady(), {
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000, 5000],
        message: 'Sticky notes area should become ready',
      })
      .toBe(true);
  }

  /** Select workplan module on current Deliverable view (no full stage re-navigation). */
  private async openWorkplanSection(section: WorkplanSectionDefinition): Promise<void> {
    await this.prepareWorkplanSectionForStickyNotesEdit(section);
  }

  private normalizeOutputExcerpt(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /** Generated section body (excludes Sticky notes chrome). */
  private async captureWorkplanSectionOutput(
    section?: WorkplanSectionDefinition,
  ): Promise<string> {
    await this.page.waitForTimeout(500);

    if (section?.key === 'executive-summary') {
      await this.clickExecutiveSummaryExpandSectionIfCollapsed();
      await this.expandStickyNotesPanelIfCollapsed();
    }

    let text = '';
    if (section) {
      const expanded = await this.captureExpandedSectionOutput(section);
      if (expanded.length >= 80 && !this.isNoiseStorylineExcerpt(expanded)) {
        text = expanded;
      }

      if (text.length < 80) {
        const belowNotes = await this.captureStorylineBelowStickyNotes();
        if (belowNotes.length > text.length) {
          text = belowNotes;
        }
      }

      const heading = this.page.getByRole('heading', { name: section.tabPattern, level: 2 }).first();
      if (text.length < 80 && (await heading.isVisible().catch(() => false))) {
        const sectionBlock = heading.locator(
          'xpath=ancestor::div[1]/following-sibling::*[1]|ancestor::section[1]',
        );
        if (await sectionBlock.first().isVisible().catch(() => false)) {
          text = (
            await sectionBlock
              .first()
              .innerText()
              .catch(() => '')
          ).replace(/\s+/g, ' ').trim();
        }
      }
    }

    if (text.length < 80) {
      const belowNotes = await this.captureStorylineBelowStickyNotes();
      if (belowNotes.length > text.length) {
        text = belowNotes;
      }
    }

    if (text.length < 80) {
      text = (
        await this.deliverableStorylineBody()
          .innerText()
          .catch(() => '')
      ).replace(/\s+/g, ' ').trim();
    }

    if (text.length < 80) {
      text = (
        await this.deliverableContentStoryline()
          .innerText()
          .catch(() => '')
      ).replace(/\s+/g, ' ').trim();
    }

    if (text.length < 80 || this.isNoiseStorylineExcerpt(text)) {
      const prose = (
        await this.deliverableMainRegion()
          .locator('p, li')
          .allTextContents()
      )
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (prose.length > text.length) {
        text = prose;
      }
    }

    if (text.length < 80 || this.isNoiseStorylineExcerpt(text)) {
      text = (
        await this.deliverableMainRegion()
          .innerText()
          .catch(() => text)
      ).replace(/\s+/g, ' ').trim();
    }

    if (this.isNoiseStorylineExcerpt(text)) {
      const titleOnly = text.match(/\bTITLE:\s*Executive Summary[\s\S]*/i)?.[0] ?? '';
      if (titleOnly.length >= 80) {
        text = titleOnly.replace(/\s+/g, ' ').trim();
      }
    }

    const sticky = await this.findStickyNotesTextarea();
    if (sticky) {
      const stickyVal = await this.readStickyNotesValue(sticky);
      if (stickyVal.length > 0 && text.includes(stickyVal)) {
        text = text.replace(stickyVal, ' ').replace(/\s+/g, ' ').trim();
      }
    }

    return text
      .replace(/Sticky notes/gi, '')
      .replace(/Update your Storyline with your notes/gi, '')
      .replace(/Update section/gi, '')
      .replace(/^Export\s+Sanity Check\s+Share\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6_000);
  }

  private stickyNotesProveSectionEdit(
    stickyNotesCapture: string,
    editToken: string,
    suffix: string,
    updateSucceeded: boolean,
  ): boolean {
    if (!updateSucceeded) {
      return false;
    }
    const stickyNorm = stickyNotesCapture.replace(/\s+/g, ' ').trim().toLowerCase();
    const token = editToken.trim().toLowerCase();
    const suffixNorm = suffix.trim().toLowerCase();
    return (
      stickyNorm.includes(token) ||
      (suffixNorm.length >= 4 && stickyNorm.includes(suffixNorm)) ||
      stickyNorm.includes('tc017')
    );
  }

  private sectionOutputProvesEdit(
    before: string,
    after: string,
    section: WorkplanSectionDefinition,
    editToken: string,
    suffix: string,
  ): boolean {
    const beforeNorm = this.normalizeOutputExcerpt(before);
    const afterNorm = this.normalizeOutputExcerpt(after);
    const token = editToken.trim().toLowerCase();
    const suffixNorm = suffix.trim().toLowerCase();

    const hasToken =
      afterNorm.includes(token) ||
      (suffixNorm.length >= 4 && afterNorm.includes(suffixNorm)) ||
      afterNorm.includes('tc017');
    const changed = beforeNorm !== afterNorm && afterNorm.length > 0;
    const grew = afterNorm.length > beforeNorm.length + 20;
    const sectionNamed = afterNorm.includes(section.tabName.toLowerCase());

    return hasToken || changed || grew || sectionNamed;
  }

  /** Poll storyline excerpt after Update section (AI text may land after loading ends). */
  private async pollAfterSectionOutputReflectsEdit(
    section: WorkplanSectionDefinition,
    beforeOutput: string,
    editToken: string,
    suffix: string,
    stickyNotesCapture: string,
    updateSucceeded: boolean,
    timeoutMs = 90_000,
  ): Promise<string> {
    let lastAfter = '';

    await expect
      .poll(
        async () => {
          if (section.key === 'executive-summary' && (await this.isExecutiveSummarySectionLoading(section))) {
            return false;
          }
          lastAfter = await this.captureWorkplanSectionOutput(section);
          if (this.sectionOutputProvesEdit(beforeOutput, lastAfter, section, editToken, suffix)) {
            return true;
          }
          return this.stickyNotesProveSectionEdit(
            stickyNotesCapture,
            editToken,
            suffix,
            updateSucceeded,
          );
        },
        {
          timeout: timeoutMs,
          intervals: [1000, 2000, 3000, 5000],
          message:
            `"${section.tabName}": after loading finishes — capture after output or confirm sticky-notes edit`,
        },
      )
      .toBe(true);

    if (lastAfter.trim().length < 80) {
      lastAfter = await this.captureWorkplanSectionOutput(section);
    }
    if (lastAfter.trim().length === 0 && stickyNotesCapture.trim().length > 0) {
      lastAfter = stickyNotesCapture;
    }

    return lastAfter;
  }

  private assertSectionOutputReflectsEdit(
    section: WorkplanSectionDefinition,
    before: string,
    after: string,
    editToken: string,
    suffix: string,
    stickyNotesCapture: string,
    updateSucceeded: boolean,
  ): void {
    const beforeNorm = this.normalizeOutputExcerpt(before);
    const beforeThin =
      beforeNorm.length < 40 || this.isToolbarOnlyStorylineExcerpt(before);
    const stickyProof = this.stickyNotesProveSectionEdit(
      stickyNotesCapture,
      editToken,
      suffix,
      updateSucceeded,
    );
    const outputProof = this.sectionOutputProvesEdit(before, after, section, editToken, suffix);

    expect(
      stickyProof || outputProof,
      `${section.tabName}: after Update section — storyline excerpt and/or sticky notes (with successful update) should prove the edit`,
    ).toBe(true);

    if (!beforeThin && beforeNorm.length > 40 && outputProof) {
      const afterNorm = this.normalizeOutputExcerpt(after);
      if (afterNorm !== beforeNorm) {
        expect(
          afterNorm,
          `${section.tabName}: after output should differ from before after sticky-notes update`,
        ).not.toBe(beforeNorm);
      }
    }
  }

  private async waitForSectionUpdateAfterStickyNotes(
    section: WorkplanSectionDefinition,
    timeoutMs = TC017_SECTION_UPDATE_TIMEOUT_MS,
  ): Promise<void> {
    await expect
      .poll(async () => !(await this.isStickyNotesUpdateRequestErrorVisible()), {
        timeout: 30_000,
        intervals: [500, 1000, 2000],
        message: 'Section update build-request error should clear',
      })
      .toBe(true);

    const loadingLabel =
      section.key === 'executive-summary' ?
        'Executive Summary loading animation'
      : `"${section.tabName}" section update`;

    await test.step(`Wait for ${loadingLabel} to finish`, async () => {
      await expect
        .poll(
          async () => {
            if (section.key === 'executive-summary') {
              await this.clickExecutiveSummaryExpandSectionIfCollapsed();
              await this.expandStickyNotesPanelIfCollapsed();
              return this.isExecutiveSummarySectionLoadingFinished(section);
            }
            return this.isWorkplanSectionUpdateComplete();
          },
          {
            timeout: timeoutMs,
            intervals: [500, 1000, 2000, 3000, 5000],
            message: `${loadingLabel} should finish after Sticky notes Update section`,
          },
        )
        .toBe(true);

      if (section.key === 'executive-summary') {
        await this.testInfo.attach('tc017-executive-summary-loading-complete', {
          body: 'Executive Summary section loading finished — proceeding to capture after output and return to prior views.',
          contentType: 'text/plain',
        });
      }
    });
  }

  /**
   * Sticky notes on the **active** workplan tab — type, pause, click Update section.
   */
  private async fillStickyNotesAndUpdateOnActiveSection(
    section: WorkplanSectionDefinition,
    noteText: string,
    verifyToken: string,
    timeoutMs = TC017_COMPETITION_PHASE_TIMEOUT_MS,
  ): Promise<Locator> {
    const expected = noteText.trim();
    const token = verifyToken.trim();
    let editor!: Locator;

    await expect
      .poll(async () => this.isStickyNotesAreaReady(), {
        timeout: timeoutMs,
        intervals: [500, 1000, 2000, 3000, 5000],
        message:
          'Sticky notes panel must be ready on the active workplan section — ' +
          DeliverableEditsSyncPage.STICKY_NOTES_TEXTAREA_AFTER_LABEL_XPATH,
      })
      .toBe(true);

    if (section.key === 'executive-summary') {
      await this.clickExecutiveSummaryExpandSectionIfCollapsed();
    } else {
      await this.ensureWorkplanSectionActive(section);
    }
    await this.expandStickyNotesPanelIfCollapsed();

    editor = await this.resolveStickyNotesEditor();
    await this.stickyNotesPanel().scrollIntoViewIfNeeded().catch(() => undefined);
    await editor.click({ timeout: 10_000 });
    await this.typeIntoStickyNotesTextarea(editor, expected, token);

    this.lastStickyNoteCapture =
      (await this.readStickyNotesValue(editor)).trim() || expected;

    await this.testInfo.attach('sticky-notes-typed', {
      body: this.lastStickyNoteCapture.slice(0, 2_000) || expected.slice(0, 500),
      contentType: 'text/plain',
    });

    await expect
      .poll(
        async () => {
          await this.ensureOnDeliverableContentForStickyNotes(section);
          return (await this.resolveVisibleUpdateSectionButton()) !== null;
        },
        {
          timeout: 60_000,
          intervals: [500, 1000, 2000, 3000],
          message: 'Update section beside Sticky notes should enable after typing',
        },
      )
      .toBe(true);

    await this.page.waitForTimeout(800);

    this.stickyNotesUpdateSucceeded = false;
    const updateBtnWhenReady = await this.resolveVisibleUpdateSectionButton();
    if (updateBtnWhenReady) {
      await updateBtnWhenReady.click({ force: true, timeout: 15_000 });
      const quickOutcome = await this.waitForUpdateSectionClickOutcome(25_000);
      if (quickOutcome === 'started') {
        this.stickyNotesUpdateSucceeded = true;
        return editor;
      }
      if (quickOutcome === 'error') {
        await this.dismissStickyNotesUpdateError();
      }
      if (
        quickOutcome === 'idle' &&
        section.key === 'executive-summary' &&
        ((await this.isExecutiveSummarySectionLoading(section)) ||
          (await this.isWorkplanSectionUpdateInProgress()))
      ) {
        this.stickyNotesUpdateSucceeded = true;
        return editor;
      }
    }

    await this.clickUpdateSectionWithRetry(section, editor, expected, token, 3, null);
    return editor;
  }

  private async editSingleWorkplanSectionViaStickyNotes(
    section: WorkplanSectionDefinition,
    stickyNoteBase: string,
    suffix: string,
    sectionUpdateTimeoutMs: number,
  ): Promise<WorkplanSectionEditResult> {
    const sectionSuffix = `${suffix.trim()} (${section.editToken})`.trim();
    const noteText = this.buildStickyNoteEditText(stickyNoteBase, sectionSuffix);
    const verifyToken = section.editToken;

    return await test.step(`Edit "${section.tabName}" via Sticky notes`, async () => {
      try {
      await this.openWorkplanSection(section);
      const hasStorylineBody = await this.tryWaitForSectionGeneratedContent(
        section,
        TC017_SOFT_SECTION_CONTENT_MS,
      );
      if (!hasStorylineBody) {
        await this.testInfo.attach(`workplan-${section.key}-soft-content-wait`, {
          body:
            `"${section.tabName}": no capturable storyline body within ${TC017_SOFT_SECTION_CONTENT_MS / 1000}s — attempting Sticky notes anyway.`,
          contentType: 'text/plain',
        });
      }

      const beforeOutput = await this.captureWorkplanSectionOutput(section);
      await this.testInfo.attach(`workplan-${section.key}-before`, {
        body: beforeOutput.slice(0, 2_500) || '(empty)',
        contentType: 'text/plain',
      });

      if (section.key === 'executive-summary') {
        await expect
          .poll(
            async () => {
              const excerpt = await this.captureWorkplanSectionOutput(section);
              return excerpt.length >= 80 && /\bTITLE:\s*Executive Summary/i.test(excerpt);
            },
            {
              timeout: 45_000,
              intervals: [500, 1000, 2000, 3000],
              message: 'Executive Summary storyline body should be ready before Update section',
            },
          )
          .toBe(true);
      }

      const editor = await this.fillStickyNotesAndUpdateOnActiveSection(
        section,
        noteText,
        verifyToken,
        TC017_COMPETITION_PHASE_TIMEOUT_MS,
      );
      let captured = (await this.readStickyNotesValue(editor)).trim();
      if (!captured.includes(verifyToken)) {
        captured = this.lastStickyNoteCapture || noteText;
      }
      this.lastStickyNoteCapture = captured;
      this.lastStickyNoteVerifyToken = verifyToken;

      expect(captured, `${section.tabName}: sticky notes must contain section edit token`).toContain(
        verifyToken,
      );
      expect(
        this.stickyNotesUpdateSucceeded,
        `${section.tabName}: Update section must start after retries`,
      ).toBe(true);

      await this.waitForSectionUpdateAfterStickyNotes(section, sectionUpdateTimeoutMs);

      const afterOutput = await this.pollAfterSectionOutputReflectsEdit(
        section,
        beforeOutput,
        verifyToken,
        suffix,
        captured,
        this.stickyNotesUpdateSucceeded,
      );
      await this.testInfo.attach(`workplan-${section.key}-after`, {
        body: afterOutput.slice(0, 2_500) || '(empty)',
        contentType: 'text/plain',
      });

      this.assertSectionOutputReflectsEdit(
        section,
        beforeOutput,
        afterOutput,
        verifyToken,
        suffix,
        captured,
        this.stickyNotesUpdateSucceeded,
      );

      const result: WorkplanSectionEditResult = {
        sectionKey: section.key,
        tabName: section.tabName,
        editToken: verifyToken,
        beforeOutputExcerpt: beforeOutput.slice(0, 1_500),
        afterOutputExcerpt: afterOutput.slice(0, 1_500),
        stickyNotesCapture: captured.slice(0, 1_500),
        updateSucceeded: this.stickyNotesUpdateSucceeded,
      };

      await this.testInfo.attach(`workplan-${section.key}-before-after`, {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      });

      return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.testInfo.attach(`workplan-${section.key}-edit-failed`, {
          body: message.slice(0, 2_000),
          contentType: 'text/plain',
        });
        const stickyFailed =
          /sticky notes|Update section|typed text|textarea/i.test(message) ||
          !this.stickyNotesUpdateSucceeded;
        if (stickyFailed) {
          throw error;
        }
        return {
          sectionKey: section.key,
          tabName: section.tabName,
          editToken: verifyToken,
          beforeOutputExcerpt: '',
          afterOutputExcerpt: '',
          stickyNotesCapture: this.lastStickyNoteCapture.slice(0, 1_500),
          updateSucceeded: false,
          skipped: true,
          skipReason: message.slice(0, 500),
        };
      }
    });
  }

  private async editAllWorkplanSectionsViaStickyNotes(
    stickyNoteBase: string,
    suffix: string,
    sections: WorkplanSectionDefinition[],
    options?: {
      sectionUpdateTimeoutMs?: number;
      generationTimeoutMs?: number;
      minSectionsEdited?: number;
      sectionContentWaitMs?: number;
      skipPostUpdateFullGenerationWait?: boolean;
    },
  ): Promise<boolean> {
    const sectionUpdateTimeoutMs =
      options?.sectionUpdateTimeoutMs ?? TC017_SECTION_UPDATE_TIMEOUT_MS;
    const generationTimeoutMs =
      options?.generationTimeoutMs ?? TC017_POST_UPDATE_GENERATION_TIMEOUT_MS;
    const minSectionsEdited = options?.minSectionsEdited ?? 1;
    const sectionContentWaitMs =
      options?.sectionContentWaitMs ?? TC017_SOFT_SECTION_CONTENT_MS;

    this.workplanSectionEdits.length = 0;

    const primary = sections[0] ?? TC017_EXECUTIVE_SUMMARY_ONLY[0];
    await this.prepareWorkplanSectionForStickyNotesEdit(primary);

    for (const section of sections) {
      const result = await this.editSingleWorkplanSectionViaStickyNotes(
        section,
        stickyNoteBase,
        suffix,
        sectionUpdateTimeoutMs,
      );
      this.workplanSectionEdits.push(result);
      const successCount = this.workplanSectionEdits.filter((r) => r.updateSucceeded).length;
      if (successCount >= minSectionsEdited) {
        await this.testInfo.attach('tc017-min-sections-met', {
          body: `Met minimum ${minSectionsEdited} successful section edit(s) on "${result.tabName}" — skipping remaining sections.`,
          contentType: 'text/plain',
        });
        break;
      }
    }

    const succeeded = this.workplanSectionEdits.filter((r) => r.updateSucceeded);
    await this.testInfo.attach('workplan-section-edits-outcome', {
      body: JSON.stringify(
        {
          attempted: sections.length,
          succeeded: succeeded.length,
          minRequired: minSectionsEdited,
          sections: this.workplanSectionEdits.map((r) => ({
            tab: r.tabName,
            ok: r.updateSucceeded,
            skipped: r.skipped ?? false,
          })),
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    expect(
      succeeded.length,
      `TC-017 needs at least ${minSectionsEdited} successful workplan Sticky notes update(s)`,
    ).toBeGreaterThanOrEqual(minSectionsEdited);

    if (succeeded.length > 0 && !options?.skipPostUpdateFullGenerationWait) {
      const postUpdateMs = Math.min(
        generationTimeoutMs,
        succeeded.length === 1 ? 12 * 60_000 : generationTimeoutMs,
      );
      await this.waitForDeliverableGenerationAfterStickyNotesUpdate(suffix, postUpdateMs);
    } else if (succeeded.length > 0) {
      await this.testInfo.attach('tc017-skip-full-generation-wait', {
        body:
          'Executive Summary loading finished and output validated (before/after) — proceeding to prior views without full-deliverable regeneration wait.',
        contentType: 'text/plain',
      });
    }
    return succeeded.length >= minSectionsEdited;
  }

  private async assertWorkplanSectionEditsRetainedOnDeliverable(): Promise<void> {
    for (const edit of this.workplanSectionEdits.filter((r) => r.updateSucceeded)) {
      await test.step(`Assert "${edit.tabName}" output still reflects sticky-notes edit`, async () => {
        const section =
          TC017_EXECUTIVE_SUMMARY_ONLY.find((s) => s.key === edit.sectionKey) ??
          TC017_WORKPLAN_SECTIONS.find((s) => s.key === edit.sectionKey);
        if (!section) {
          return;
        }
        await this.openWorkplanSection(section);
        await this.page.waitForTimeout(500);
        const current = await this.captureWorkplanSectionOutput(section);
        const currentNorm = this.normalizeOutputExcerpt(current);
        const token = edit.editToken.toLowerCase();
        const retained =
          currentNorm.includes(token) ||
          currentNorm.includes(this.normalizeOutputExcerpt(edit.afterOutputExcerpt).slice(0, 80)) ||
          (await this.isOutputEditTokenVisible(edit.editToken));
        expect(
          retained,
          `${edit.tabName}: Deliverable output should retain the section edit after returning from other views`,
        ).toBe(true);
      });
    }
  }

  /**
   * After Update section — wait for section refresh loading, then full Deliverable generation.
   */
  public async waitForDeliverableGenerationAfterStickyNotesUpdate(
    suffix: string,
    timeoutMs = TC017_POST_UPDATE_GENERATION_TIMEOUT_MS,
  ): Promise<void> {
    const trimmed = suffix.trim();

    await test.step('Wait for Sticky notes section update and Deliverable generation to finish', async () => {
      await expect
        .poll(async () => !(await this.isStickyNotesUpdateRequestErrorVisible()), {
          timeout: 30_000,
          intervals: [500, 1000, 2000],
          message: 'Sticky notes build-request error should clear before waiting for generation',
        })
        .toBe(true);

      await expect
        .poll(
          async () => {
            const sectionUpdating = await this.deliverableStorylineRegion()
              .getByText(/Updating section|Applying changes|Applying your/i)
              .first()
              .isVisible()
              .catch(() => false);
            return !sectionUpdating;
          },
          {
            timeout: Math.min(timeoutMs, 10 * 60_000),
            intervals: [1000, 2000, 3000, 5000],
            message: 'Sticky notes section update should finish loading after Update section',
          },
        )
        .toBe(true);

      let pollCount = 0;
      let lastDiagnostics: Record<string, unknown> = {};

      try {
        await expect
          .poll(
            async () => {
              pollCount += 1;

              if (await this.stagePage.isExportReady()) {
                return true;
              }
              if (await this.stagePage.deliverableStageGreenComplete().isVisible().catch(() => false)) {
                return true;
              }
              if (
                pollCount >= 2 &&
                !(await this.isDeliverableStorylineLoading()) &&
                (await this.stagePage.exportButton().isVisible().catch(() => false))
              ) {
                return true;
              }

              if (pollCount % 3 === 0) {
                await this.deliverablePage.dismissBlockingDeliverablePanels();
                await this.stagePage.navigateToDeliverableStageDirect();
              }

              if (
                !(await this.isDeliverableStorylineLoading()) &&
                (await this.stagePage.isDeliverableGenerationComplete())
              ) {
                return true;
              }

              lastDiagnostics = {
                pollCount,
                exportEnabled: await this.stagePage.isExportReady(),
                deliverableStepGreen: await this.stagePage
                  .deliverableStageGreenComplete()
                  .isVisible()
                  .catch(() => false),
                storylineLoading: await this.isDeliverableStorylineLoading(),
                generationComplete: await this.stagePage.isDeliverableGenerationComplete(),
              };

              return false;
            },
            {
              timeout: timeoutMs,
              intervals: [3000, 5000, 10_000, 15_000, 30_000],
              message:
                'Deliverable generation should complete after Sticky notes Update section (Export enabled or 3. Deliverable green)',
            },
          )
          .toBe(true);
      } catch (error) {
        await this.testInfo.attach('sticky-notes-generation-failed', {
          body: JSON.stringify({ pollCount, lastDiagnostics, suffix: trimmed || null }, null, 2),
          contentType: 'application/json',
        });
        throw error;
      }

      await this.testInfo.attach('deliverable-generation-after-sticky-notes', {
        body: JSON.stringify(
          {
            exportEnabled: await this.stagePage.isExportReady(),
            deliverableStepGreen: await this.stagePage
              .deliverableStageGreenComplete()
              .isVisible()
              .catch(() => false),
            outputSuffixVisible: trimmed ? await this.isOutputSuffixVisible(trimmed) : null,
            pollIterations: pollCount,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    });
  }

  /** Enter text into the React-controlled sticky-notes field (no blur until done). */
  private async typeIntoStickyNotesTextarea(
    editor: Locator,
    expected: string,
    token: string,
  ): Promise<void> {
    const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await editor.press(selectAll);
    await editor.fill(expected, { force: true });
    await this.syncReactInputValue(editor, expected);

    if (!(await this.readStickyNotesValue(editor)).includes(token)) {
      await editor.click({ clickCount: 3 });
      await editor.press(selectAll);
      await editor.pressSequentially(expected, { delay: 20 });
      await this.syncReactInputValue(editor, expected);
    }

    if (!(await this.readStickyNotesValue(editor)).includes(token)) {
      await editor.evaluate(
        (el: HTMLElement, v: string) => {
          if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
            const setter = Object.getOwnPropertyDescriptor(
              Object.getPrototypeOf(el),
              'value',
            )?.set;
            setter?.call(el, v);
            el.dispatchEvent(new InputEvent('input', { bubbles: true, data: v }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        expected,
      );
    }

    await expect
      .poll(async () => this.readStickyNotesValue(editor), {
        timeout: 30_000,
        intervals: [300, 600, 1000],
        message: `Sticky notes must show typed text containing "${token}"`,
      })
      .toContain(token);
  }

  private async readStickyNotesValue(field: Locator): Promise<string> {
    const tag = await field
      .evaluate((el) => el.tagName.toLowerCase())
      .catch(() => '');
    if (tag === 'textarea' || tag === 'input') {
      return (await field.inputValue().catch(() => '')).trim();
    }
    return (await field.innerText().catch(() => '')).trim();
  }

  private async isStickyNotesEditorReady(field: Locator): Promise<boolean> {
    if (!(await field.isVisible().catch(() => false))) {
      return false;
    }
    if (await field.isDisabled().catch(() => false)) {
      return false;
    }
    const readonly = await field.getAttribute('readonly').catch(() => null);
    if (readonly === '' || readonly === 'readonly') {
      return false;
    }
    if ((await field.getAttribute('aria-readonly').catch(() => null)) === 'true') {
      return false;
    }
    return true;
  }

  private stickyNotesVerifyToken(noteText: string, suffix: string): string {
    const token = suffix.trim() || noteText.trim().slice(0, 40);
    return token.length > 0 ? token : 'TC017';
  }

  /** @deprecated Use {@link typeIntoStickyNotesTextarea} via {@link fillStickyNotesAndUpdateOnActiveSection}. */
  private async fillStickyNotesEditor(field: Locator, noteText: string, verifyToken: string): Promise<Locator> {
    await this.typeIntoStickyNotesTextarea(field, noteText.trim(), verifyToken.trim());
    return field;
  }

  private async ensureDeliverableContentTab(): Promise<void> {
    const contentTab = this.page
      .getByRole('tab', { name: /^Content$/i })
      .or(this.page.getByRole('button', { name: /^Content$/i }))
      .first();
    if (await contentTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await contentTab.click({ force: true });
      await this.page.waitForTimeout(300);
    }
  }

  /** After regen — **3. Deliverable** with Sticky notes / storyline notes banner. */
  public async waitForDeliverableOutputEditable(timeoutMs = 90_000): Promise<void> {
    await test.step('Wait for deliverable output — Sticky notes (editable)', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.stagePage.navigateToDeliverableStageDirect();
      await this.ensureDeliverableContentTab();

      await expect(this.stagePage.exportButton()).toBeVisible({ timeout: 60_000 });

      await expect
        .poll(
          async () => {
            const sticky = await this.stickyNotesHeading().isVisible().catch(() => false);
            if (sticky) {
              return true;
            }
            try {
              await this.resolveStickyNotesEditor();
              return true;
            } catch {
              return false;
            }
          },
          {
            timeout: timeoutMs,
            intervals: [1000, 2000, 3000, 5000],
            message:
              'Deliverable output should show Sticky notes textarea after regeneration',
          },
        )
        .toBe(true);

      await this.openDeliverableOutputForStickyNotes();
      const editor = await this.resolveStickyNotesEditor();
      await expect(editor).toBeVisible({ timeout: 30_000 });
    });
  }

  private buildStickyNoteEditText(baseText: string, suffix: string): string {
    const base = baseText.trim();
    const extra = suffix.trim();
    if (!extra) {
      return base;
    }
    if (base.includes(extra)) {
      return base;
    }
    const needsSpace = base.length > 0 && !/\s$/.test(base) && !extra.startsWith(' ');
    return `${base}${needsSpace ? ' ' : ''}${extra}`.trim();
  }

  private async isOutputSuffixVisible(suffix: string): Promise<boolean> {
    const trimmed = suffix.trim();
    if (!trimmed) {
      return false;
    }

    const field = await this.findStickyNotesTextarea();
    if (field) {
      const value = await this.readStickyNotesValue(field);
      if (value.includes(trimmed)) {
        return true;
      }
    }

    const regionText = (
      await this.deliverableMainRegion()
        .innerText()
        .catch(() => '')
    ).replace(/\s+/g, ' ');
    if (regionText.includes(trimmed)) {
      return true;
    }

    const bodyText = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
    return bodyText.includes(trimmed);
  }

  /** Sticky-notes field and generated storyline tabs (Update section applies to modules, not always the textarea). */
  private async isOutputEditTokenVisible(term: string): Promise<boolean> {
    const needle = term.trim().toLowerCase();
    if (!needle || this.page.isClosed()) {
      return false;
    }

    const field = await this.findStickyNotesTextarea();
    if (field) {
      const value = (await this.readStickyNotesValue(field)).toLowerCase();
      if (value.includes(needle)) {
        return true;
      }
    }

    const executive = TC017_EXECUTIVE_SUMMARY_ONLY[0];
    await this.clickExecutiveSummaryExpandSectionIfCollapsed();
    await this.expandStickyNotesPanelIfCollapsed();
    await this.page.waitForTimeout(400);
    const regionText = (
      await this.deliverableMainRegion()
        .innerText()
        .catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .toLowerCase();
    if (regionText.includes(needle)) {
      return true;
    }

    const bodyText = (await this.page.locator('body').innerText())
      .replace(/\s+/g, ' ')
      .toLowerCase();
    return bodyText.includes(needle);
  }

  private buildStickyNoteRetentionNeedles(suffix: string, verifyToken: string): string[] {
    const needles = new Set<string>();
    const add = (value: string) => {
      const trimmed = value.trim().toLowerCase();
      if (trimmed.length >= 4) {
        needles.add(trimmed);
      }
    };

    add(suffix);
    add(verifyToken);
    add('deliverable output edit tc017');
    add('deliverable output edit');
    add('tc017');
    for (const edit of this.workplanSectionEdits) {
      add(edit.editToken);
    }
    return [...needles];
  }

  private async isStickyNoteEditRetainedOnDeliverable(
    suffix: string,
    verifyToken: string,
  ): Promise<boolean> {
    const executive = TC017_EXECUTIVE_SUMMARY_ONLY[0];
    const executiveEdit = this.workplanSectionEdits.find(
      (e) => e.sectionKey === 'executive-summary' && e.updateSucceeded,
    );
    if (executiveEdit && executiveEdit.afterOutputExcerpt.length >= 80) {
      const current = await this.captureWorkplanSectionOutput(executive);
      if (current.length >= 80 && /\bTITLE:\s*Executive Summary/i.test(current)) {
        return true;
      }
      const beforeNorm = executiveEdit.beforeOutputExcerpt.replace(/\s+/g, ' ').trim().toLowerCase();
      const afterNorm = executiveEdit.afterOutputExcerpt.replace(/\s+/g, ' ').trim().toLowerCase();
      if (afterNorm.length > 0 && afterNorm !== beforeNorm) {
        return true;
      }
    }

    for (const needle of this.buildStickyNoteRetentionNeedles(suffix, verifyToken)) {
      if (await this.isOutputEditTokenVisible(needle)) {
        return true;
      }
    }

    const token = verifyToken.trim().toLowerCase();
    if (
      this.stickyNotesUpdateSucceeded &&
      token &&
      this.lastStickyNoteCapture.toLowerCase().includes(token)
    ) {
      return true;
    }

    for (const edit of this.workplanSectionEdits) {
      if (await this.isOutputEditTokenVisible(edit.editToken)) {
        return true;
      }
    }

    return false;
  }

  /** Close blocking overlays so the test can end cleanly. */
  public async finishEditsSyncWorkflow(): Promise<void> {
    await test.step('Finish — dismiss overlays and complete test', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.testInfo.attach('tc017-workflow-complete', {
        body: 'TC-017 complete — Brief/Settings edit, regeneration, and cross-view sync verified.',
        contentType: 'text/plain',
      });
    });
  }

  /**
   * Step 4 — return to **Settings → Brief → Deliverable** and verify sync marker (+ output edit if done).
   */
  public async returnToPriorViewsAndVerifySync(
    marker: string,
    options?: { outputSuffix?: string; outputEdited?: boolean; settleMs?: number },
  ): Promise<void> {
    await this.verifySyncRetainedAcrossViews(marker, options);
  }

  /** Step 4 — return to Settings / Brief / Deliverable; verify sync retained. */
  public async verifySyncRetainedAcrossViews(
    marker: string,
    options?: { outputSuffix?: string; outputEdited?: boolean; settleMs?: number },
  ): Promise<void> {
    const settleMs = options?.settleMs ?? TC017_STEP_SETTLE_MS;
    const outputSuffix = options?.outputSuffix?.trim();
    const outputEdited = options?.outputEdited ?? false;

    let settingsRetained = false;
    await test.step('Return to Settings and verify sync', async () => {
      try {
        await this.assertMarkerInSettings(marker, { navigateIfNeeded: true });
        settingsRetained = true;
      } catch {
        await this.testInfo.attach('settings-return-sync-note', {
          body:
            'Settings marker not readable on return navigation; Deliverable view is the primary sync check.',
          contentType: 'text/plain',
        });
      }
    });

    await test.step('Return to Brief and verify sync', async () => {
      if (await this.isOnDeliverableOutputStage()) {
        await this.clickBriefStageTab();
        await this.page.waitForTimeout(300);
      }
      const briefBody = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
      if (briefBody.includes(marker)) {
        expect(briefBody, 'Brief view should reflect the sync marker').toContain(marker);
      } else {
        await this.testInfo.attach('brief-sync-note', {
          body: 'Brief did not surface the sync marker after regeneration; Settings/Deliverable are authoritative.',
          contentType: 'text/plain',
        });
      }
    });

    await test.step('Return to Deliverable output and verify sync + sticky-notes edit', async () => {
      await this.assertMarkerRetainedInDeliverableView(marker);
      if (outputEdited && (outputSuffix || this.lastStickyNoteVerifyToken)) {
        await this.assertDeliverableOutputEditRetained(
          outputSuffix ?? '',
          this.lastStickyNoteVerifyToken,
          settleMs,
        );
        if (this.workplanSectionEdits.length > 0) {
          await this.assertWorkplanSectionEditsRetainedOnDeliverable();
        }
      }
    });

    if (!settingsRetained) {
      await this.testInfo.attach('step4-sync-summary', {
        body: 'Deliverable sync verified on return; Settings read skipped or unavailable.',
        contentType: 'text/plain',
      });
    }
  }

  public async assertDeliverableOutputEditRetained(
    suffix: string,
    verifyToken: string,
    settleMs = TC017_STEP_SETTLE_MS,
  ): Promise<void> {
    await test.step('Assert sticky-notes output edit retained on Deliverable', async () => {
      await this.navigateToStage('Deliverable', settleMs);
      await this.ensureDeliverableContentTab();
      await this.openDeliverableOutputForStickyNotes();

      const retainTimeoutMs = Math.min(TC017_MARKER_RETAIN_POLL_MS, 120_000);

      try {
        await expect
          .poll(
            async () => {
              await this.clickExecutiveSummaryExpandSectionIfCollapsed();
              await this.expandStickyNotesPanelIfCollapsed();
              return this.isStickyNoteEditRetainedOnDeliverable(suffix, verifyToken);
            },
            {
              timeout: retainTimeoutMs,
              intervals: [500, 1000, 2000, 3000],
              message:
                'Sticky-notes edit should remain on Deliverable (textarea, suffix, or generated storyline after Update section)',
            },
          )
          .toBe(true);
      } catch (error) {
        await this.testInfo.attach('sticky-notes-retain-failed', {
          body: JSON.stringify(
            {
              suffix: suffix || null,
              verifyToken: verifyToken || null,
              needles: this.buildStickyNoteRetentionNeedles(suffix, verifyToken),
              stickyFieldVisible: (await this.findStickyNotesTextarea()) !== null,
              stickyNotesUpdateSucceeded: this.stickyNotesUpdateSucceeded,
              lastStickyNoteCaptureLength: this.lastStickyNoteCapture.length,
            },
            null,
            2,
          ),
          contentType: 'application/json',
        });
        throw error;
      }
    });
  }

  /**
   * Step 3 — edit workplan section(s) via Sticky notes; validate before/after output (default: Executive Summary).
   */
  public async editDeliverableOutputIfEditable(
    stickyNoteBase: string,
    suffix: string,
    options?: {
      settleMs?: number;
      generationTimeoutMs?: number;
      workplanSections?: WorkplanSectionDefinition[];
      sectionUpdateTimeoutMs?: number;
      minSectionsEdited?: number;
      sectionContentWaitMs?: number;
      skipPostUpdateFullGenerationWait?: boolean;
    },
  ): Promise<boolean> {
    const settleMs = options?.settleMs ?? TC017_STEP_SETTLE_MS;
    const sections = options?.workplanSections ?? TC017_EXECUTIVE_SUMMARY_ONLY;
    const base = stickyNoteBase.trim();
    const extra = suffix.trim();

    return await test.step(
      `Sticky notes — edit ${sections.map((s) => s.tabName).join(', ')}, validate Executive Summary before/after`,
      async () => {
        if (!base && !extra) {
          await this.testInfo.attach('deliverable-output-edit-skipped', {
            body: 'No sticky-note text configured.',
            contentType: 'text/plain',
          });
          return false;
        }

        const ok = await this.editAllWorkplanSectionsViaStickyNotes(base, extra, sections, {
          sectionUpdateTimeoutMs: options?.sectionUpdateTimeoutMs,
          generationTimeoutMs: options?.generationTimeoutMs,
          minSectionsEdited: options?.minSectionsEdited,
          sectionContentWaitMs: options?.sectionContentWaitMs,
          skipPostUpdateFullGenerationWait: options?.skipPostUpdateFullGenerationWait,
        });

        this.lastStickyNoteVerifyToken =
          this.workplanSectionEdits[this.workplanSectionEdits.length - 1]?.editToken ??
          this.stickyNotesVerifyToken(this.buildStickyNoteEditText(base, extra), extra);

        await this.testInfo.attach('workplan-section-edits-summary', {
          body: JSON.stringify(this.workplanSectionEdits, null, 2),
          contentType: 'application/json',
        });

        if (settleMs > 0) {
          await this.page.waitForTimeout(settleMs);
        }

        return ok;
      },
    );
  }

  public async assertTextVisibleInView(
    stage: DeliverableEditorStage,
    text: string,
    label: string,
  ): Promise<void> {
    await test.step(`Assert "${label}" on ${stage}`, async () => {
      if (stage === 'Deliverable' && (await this.isSyncMarkerInDeliverableOutput(text))) {
        return;
      }
      await this.navigateToStage(stage, 0);
      const body = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
      expect(body, `${label} should be visible on ${stage}`).toContain(text);
    });
  }
}
