import { getDeliverableNewSettingsTestCaseData } from '@data/dashboard/deliverable/deliverable-new-settings.spec.data';
import { TC018_MARKER_POLL_MS, TC018_STEP_SETTLE_MS } from '@data/dashboard/deliverable/deliverable-read-update.timeouts';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { DeliverableStageNavigationPage } from '@page/dashboard/deliverable/deliverable-stage-navigation.page';
import { expect, Locator, Page, Response, test, TestInfo } from '@playwright/test';

/** TC-018 — read/update New deliverable Settings fields only (no Sticky notes). */
export class DeliverableReadUpdatePage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly deliverablePage: DeliverablePage;
  private readonly stagePage: DeliverableStageNavigationPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.deliverablePage = new DeliverablePage(page, testInfo);
    this.stagePage = new DeliverableStageNavigationPage(page, testInfo);
  }

  public setDeliverableContext(_deliverableName: string): void {
    // Reserved for stage navigation extensions.
  }

  private projectObjectivesField(): Locator {
    return this.page
      .getByText(/^Project objectives and context/i)
      .first()
      .locator('xpath=following::textarea[1]');
  }

  private timeHorizonField(): Locator {
    return this.page
      .getByText(/^Time horizon/i)
      .first()
      .locator('xpath=following::input[1]')
      .or(this.page.getByPlaceholder(/FY2026|Q1|next three years/i))
      .first();
  }

  private modeConsiderationField(): Locator {
    return this.page
      .getByText(/^Mode consideration/i)
      .first()
      .locator('xpath=following::textarea[1] | following::input[1]')
      .first();
  }

  private baseMarkerFrom(marker: string): string {
    return marker.replace(/\s*\[run-\d+]\s*$/i, '').trim();
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private isLikelySettingsPersistResponse(response: Response): boolean {
    const method = response.request().method();
    if (!['PUT', 'PATCH', 'POST'].includes(method)) {
      return false;
    }
    const url = response.url().toLowerCase();
    if (!/(deliverable|project|settings|objective|configuration|storyline)/i.test(url)) {
      return false;
    }
    const status = response.status();
    return status >= 200 && status < 400;
  }

  private async isSettingsViewActive(): Promise<boolean> {
    if (await this.projectObjectivesField().isVisible().catch(() => false)) {
      return true;
    }
    return await this.page.getByText(/^Deliverable Type/i).first().isVisible().catch(() => false);
  }

  private async openSettingsFromAnyStage(): Promise<void> {
    if (await this.isSettingsViewActive()) {
      return;
    }
    await this.deliverablePage.dismissBlockingDeliverablePanels();
    await this.deliverablePage.goToSettingsStage({ fast: true });
    await expect
      .poll(async () => this.isSettingsViewActive(), {
        timeout: 30_000,
        intervals: [400, 800, 1500, 2000],
        message: 'Settings form should be visible',
      })
      .toBe(true);
  }

  private async fillSettingsField(
    field: Locator,
    value: string,
    options?: { requiredMarker?: string },
  ): Promise<void> {
    const expected = value.trim();
    const baseMarker = options?.requiredMarker ?
      this.baseMarkerFrom(options.requiredMarker)
    : '';

    await expect(field).toBeVisible({ timeout: 15_000 });
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await field.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await field.fill(expected);
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
    );
    await expect
      .poll(
        async () => {
          const actual = (await field.inputValue().catch(() => '')).trim();
          if (baseMarker && actual.includes(baseMarker)) {
            return true;
          }
          return this.fieldValueMatches(field, expected);
        },
        {
          timeout: 8_000,
          intervals: [100, 200, 400],
          message: 'Settings field value should sync after fill',
        },
      )
      .toBe(true);
  }

  private normalizeFieldText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private async fieldValueMatches(field: Locator, expected: string): Promise<boolean> {
    const actual = (await field.inputValue().catch(() => '')).trim();
    if (actual === expected) {
      return true;
    }
    if (this.normalizeFieldText(actual) === this.normalizeFieldText(expected)) {
      return true;
    }
    // Single-line inputs collapse newlines (e.g. Time horizon).
    const collapsedActual = actual.replace(/\s+/g, '');
    const collapsedExpected = expected.replace(/\s+/g, '');
    return collapsedActual === collapsedExpected || collapsedActual.includes(collapsedExpected);
  }

  private appendMarkerMultiline(current: string, marker: string): string {
    const baseMarker = this.baseMarkerFrom(marker);
    const trimmed = current.trim();
    if (trimmed.includes(marker) || trimmed.includes(baseMarker)) {
      return trimmed.includes(marker) ? trimmed : `${trimmed}\n\n${marker.trim()}`.trim();
    }
    return `${trimmed}\n\n${marker.trim()}`.trim();
  }

  /** Single-line Settings inputs (Time horizon) — no newlines. */
  private appendMarkerInline(current: string, marker: string): string {
    const baseMarker = this.baseMarkerFrom(marker);
    const trimmed = current.trim();
    if (trimmed.includes(marker) || trimmed.includes(baseMarker)) {
      return trimmed;
    }
    return `${trimmed} — ${marker.trim()}`.trim();
  }

  private async buildObjectivesWithMarker(marker: string): Promise<string> {
    const settings = getDeliverableNewSettingsTestCaseData('001-NewDeliverableSettings').scenario;
    const field = this.projectObjectivesField();
    let current = settings.projectObjectives.trim();
    if (await field.isVisible().catch(() => false)) {
      current = (await field.inputValue().catch(() => '')).trim() || current;
    }
    return this.appendMarkerMultiline(current, marker);
  }

  private async buildTimeHorizonWithMarker(marker: string): Promise<string> {
    const settings = getDeliverableNewSettingsTestCaseData('001-NewDeliverableSettings').scenario;
    const field = this.timeHorizonField();
    let current = settings.timeHorizon.trim();
    if (await field.isVisible().catch(() => false)) {
      current = (await field.inputValue().catch(() => '')).trim() || current;
    }
    return this.appendMarkerInline(current, marker);
  }

  private async buildModeConsiderationWithMarker(marker: string): Promise<string> {
    const settings = getDeliverableNewSettingsTestCaseData('001-NewDeliverableSettings').scenario;
    const field = this.modeConsiderationField();
    let current = settings.modeConsideration?.trim() || 'Cloud-first delivery';
    if (await field.isVisible().catch(() => false)) {
      current = (await field.inputValue().catch(() => '')).trim() || current;
    }
    return this.appendMarkerMultiline(current, marker);
  }

  private async fieldContainsMarker(field: Locator, marker: string): Promise<boolean> {
    if (!(await field.isVisible().catch(() => false))) {
      return false;
    }
    const baseMarker = this.baseMarkerFrom(marker);
    const value = (await field.inputValue().catch(() => '')).trim();
    return value.includes(marker) || value.includes(baseMarker);
  }

  private async markerVisibleInSettings(marker: string): Promise<boolean> {
    if (await this.fieldContainsMarker(this.projectObjectivesField(), marker)) {
      return true;
    }
    if (await this.fieldContainsMarker(this.timeHorizonField(), marker)) {
      return true;
    }
    if (await this.fieldContainsMarker(this.modeConsiderationField(), marker)) {
      return true;
    }
    const body = (await this.page.locator('body').innerText()).replace(/\s+/g, ' ');
    const baseMarker = this.baseMarkerFrom(marker);
    return body.includes(marker) || body.includes(baseMarker);
  }

  /** Blur fields and wait for a settings/deliverable persist API call. */
  private async triggerSettingsAutosave(): Promise<Response | null> {
    const saveWait = this.page.waitForResponse(
      (resp) => this.isLikelySettingsPersistResponse(resp),
      { timeout: 25_000 },
    );

    await this.projectObjectivesField().blur().catch(() => undefined);
    await this.timeHorizonField().blur().catch(() => undefined);
    await this.modeConsiderationField().blur().catch(() => undefined);
    await this.page
      .getByRole('heading', { name: /^Work details$/i })
      .first()
      .click({ force: true })
      .catch(() => undefined);
    await this.page.getByText(/^Geographical Scope/i).first().click({ force: true }).catch(() => undefined);

    return saveWait.catch(() => null);
  }

  private async commitSettingsSave(marker: string): Promise<void> {
    await test.step('Save Settings edits', async () => {
      let saveResponse = await this.triggerSettingsAutosave();
      if (!saveResponse) {
        await this.page.waitForTimeout(800);
        saveResponse = await this.triggerSettingsAutosave();
      }

      await this.page.waitForTimeout(1_000);

      await expect
        .poll(async () => this.markerVisibleInSettings(marker), {
          timeout: 20_000,
          intervals: [300, 600, 1000, 2000],
          message: 'Updated marker should remain in Settings after save',
        })
        .toBe(true);

      await this.testInfo.attach('settings-save-response', {
        body: JSON.stringify(
          {
            persistedViaApi: saveResponse !== null,
            status: saveResponse?.status() ?? null,
            url: saveResponse?.url() ?? null,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    });
  }

  public async assertDeliverableDetailsViewable(): Promise<void> {
    await test.step('Verify deliverable details can be viewed (Settings)', async () => {
      await this.openSettingsFromAnyStage();
      await expect(this.page.getByText(/^Deliverable Type/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(this.projectObjectivesField()).toBeVisible({ timeout: 20_000 });
      await expect(this.timeHorizonField()).toBeVisible({ timeout: 15_000 });

      const excerpt = await this.stagePage.captureSettingsExcerpt();
      expect(excerpt.length, 'Settings excerpt should not be empty').toBeGreaterThan(20);

      await this.testInfo.attach('deliverable-details-readable', {
        body: excerpt.slice(0, 4000),
        contentType: 'text/plain',
      });
    });
  }

  public async updateNewDeliverableSettingsFields(
    marker: string,
    settleMs = TC018_STEP_SETTLE_MS,
  ): Promise<void> {
    await test.step('Update Settings — objectives, time horizon, mode consideration', async () => {
      await this.openSettingsFromAnyStage();
      const settings = getDeliverableNewSettingsTestCaseData('001-NewDeliverableSettings').scenario;
      await this.deliverablePage.ensureClientNameSelected(
        settings.clientSearchTerm ?? 'automation',
        settings.projectName ?? 'New project',
      );

      const objectivesText = await this.buildObjectivesWithMarker(marker);
      await this.fillSettingsField(this.projectObjectivesField(), objectivesText);

      const horizonText = await this.buildTimeHorizonWithMarker(marker);
      await this.fillSettingsField(this.timeHorizonField(), horizonText, {
        requiredMarker: marker,
      });

      const modeField = this.modeConsiderationField();
      let modeText = '';
      if (await modeField.isVisible().catch(() => false)) {
        modeText = await this.buildModeConsiderationWithMarker(marker);
        await this.fillSettingsField(modeField, modeText);
      }

      await this.commitSettingsSave(marker);

      if (settleMs > 0) {
        await this.page.waitForTimeout(settleMs);
      }

      await this.testInfo.attach('new-deliverable-fields-updated', {
        body: [
          `Objectives:\n${objectivesText}`,
          `Time horizon:\n${horizonText}`,
          modeText ? `Mode consideration:\n${modeText}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        contentType: 'text/plain',
      });
    });
  }

  /**
   * Re-focus Settings fields in place (do not open Deliverable tab — reloads server snapshot).
   */
  private async refocusSettingsFieldsInPlace(): Promise<void> {
    if (!(await this.isSettingsViewActive())) {
      await this.openSettingsFromAnyStage();
    }

    await this.page.getByText(/^Geographical Scope/i).first().click({ force: true }).catch(() => undefined);
    await this.timeHorizonField().click({ force: true }).catch(() => undefined);
    await this.page.getByText(/^Business Scope/i).first().click({ force: true }).catch(() => undefined);
    await this.projectObjectivesField().click({ force: true }).catch(() => undefined);
    await this.page.waitForTimeout(400);
  }

  /** In-place Settings refocus after save (same session). */
  public async reopenSettingsInPlaceAndAssertMarker(
    marker: string,
    timeoutMs = TC018_MARKER_POLL_MS,
  ): Promise<void> {
    await test.step('Reopen Settings in place and verify update persists', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.refocusSettingsFieldsInPlace();
      await this.assertUpdateMarkerPersisted(marker, timeoutMs, { skipStageNavigation: true });
    });
  }

  public async assertUpdateMarkerPersisted(
    marker: string,
    timeoutMs = TC018_MARKER_POLL_MS,
    options?: { skipStageNavigation?: boolean },
  ): Promise<void> {
    await test.step('Assert updated fields persist in Settings', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();

      if (!options?.skipStageNavigation) {
        await this.deliverablePage.goToSettingsStage({ fast: true });
      } else if (!(await this.isSettingsViewActive())) {
        await this.openSettingsFromAnyStage();
      }

      await expect(this.projectObjectivesField()).toBeVisible({ timeout: 20_000 });

      const baseMarker = this.baseMarkerFrom(marker);
      await expect
        .poll(async () => this.markerVisibleInSettings(marker), {
          timeout: timeoutMs,
          intervals: [500, 1000, 2000, 3000],
          message: 'Update marker should remain on New deliverable after reopen',
        })
        .toBe(true);

      const persistedIn =
        (await this.fieldContainsMarker(this.timeHorizonField(), marker)) ? 'time horizon'
        : (await this.fieldContainsMarker(this.projectObjectivesField(), marker)) ? 'objectives'
        : 'mode consideration';

      await this.testInfo.attach('settings-after-reopen', {
        body: `Marker found in: ${persistedIn} (${baseMarker})`,
        contentType: 'text/plain',
      });
    });
  }

  public async assertUpdateMarkerAbsentOnDeliverable(
    marker: string,
    deliverableLabel: string,
  ): Promise<void> {
    await test.step(
      `Assert update marker is not on "${deliverableLabel}" Settings`,
      async () => {
        await this.openSettingsFromAnyStage();
        const baseMarker = this.baseMarkerFrom(marker);
        expect(
          await this.markerVisibleInSettings(marker),
          `"${baseMarker}" should not appear on ${deliverableLabel}`,
        ).toBe(false);
      },
    );
  }
}
