import {
  DELIVERABLE_GENERATION_PROGRESS_TIMEOUT_MS,
  DELIVERABLE_GENERATION_STARTED_TIMEOUT_MS,
  DELIVERABLE_MODE_AFTER_ADD_AGENT_TIMEOUT_MS,
  DELIVERABLE_SETTINGS_SHEET_TIMEOUT_MS,
  STANDARD_PROJECT_CARDS_SETTLE_MS,
} from '@data/dashboard/deliverable/deliverable-flow.timeouts';
import { LocatorInfo } from '@interface/base/locator.interface';
import type { DeliverableFlowScenario } from '@interface/dashboard/deliverable-flow.interface';
import {
  BRIEF_ENTRY_SETTLE_MS,
  TC010_STEP_SETTLE_MS,
} from '@data/dashboard/deliverable/deliverable-new-settings.timeouts';
import type { DeliverableNewSettingsScenario } from '@interface/dashboard/deliverable-new-settings.interface';
import { DeliverableSourceUploadPage } from '@page/dashboard/deliverable/deliverable-source-upload.page';
import { DeliverableStageNavigationPage } from '@page/dashboard/deliverable/deliverable-stage-navigation.page';
import { expect, Locator, Page, test, TestInfo } from '@playwright/test';
import path from 'path';
import { PlaywrightActionsFactory } from '@utilities/playwright/playwright-actions.utils';

export interface DeliverableWorkDetailsInput {
  geographicalScope: string;
  businessScope: string;
  clientSearchTerm: string;
}

/** Home dashboard prompt — main textarea on the greeting screen. */
const DASHBOARD_PROMPT_TEXTAREA_XPATH = "//textarea[@placeholder='Type something here']";

/** Standard project card — page-level (heading and cards are siblings, not under the same shallow `motion.div`). */
function standardProjectCardButtonXpath(projectName: string): string {
  const escaped = projectName.replace(/'/g, "\\'");
  return `//button[@type='button' and contains(@class,'rounded-2xl') and contains(@class,'text-left') and .//h4[normalize-space()='${escaped}']]`;
}

function standardProjectCardByTitleXpath(projectName: string): string {
  const escaped = projectName.replace(/'/g, "\\'");
  return `//h4[normalize-space()='${escaped}']/ancestor::button[@type='button'][1]`;
}

/**
 * Dashboard home: greeting + **Type something here** textarea + **Build a Deliverable**.
 */
export class DeliverablePage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly actions: PlaywrightActionsFactory;
  private readonly locators: { [key: string]: LocatorInfo };
  /** TC-010: skip duplicate settings waits after {@link goToSettingsStage}. */
  private settingsFormReady = false;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.actions = new PlaywrightActionsFactory(page, testInfo);

    this.locators = {
      dashboardPromptTextarea: {
        description: 'Dashboard home prompt textarea',
        locator: page
          .locator(`xpath=${DASHBOARD_PROMPT_TEXTAREA_XPATH}`)
          .or(page.getByPlaceholder('Type something here')),
      },
      buildDeliverableButton: {
        description: 'Build a Deliverable',
        locator: page.getByRole('button', { name: /Build a Deliverable/i }),
      },
      addThisAgentButton: {
        description: 'Add This Agent (Select Standard Project modal)',
        locator: page.getByRole('button', { name: /Add This Agent/i }),
      },
      deliverableModeSubmitButton: {
        description: 'Deliverable mode submit (send icon next to Improve Brief)',
        locator: page
          .getByRole('button', { name: /Improve Brief/i })
          .locator('xpath=following-sibling::button[1]')
          .or(page.locator('button:has(svg.lucide-send)').last())
          .or(page.locator('button:has(svg.lucide-paper-plane)').last()),
      },
      generateDeliverableButton: {
        description: 'Generate deliverable',
        locator: page.getByRole('button', { name: /Generate deliverable/i }),
      },
    };
  }

  /** Main content in deliverable mode (MCP: **My Deliverable Structure** + **Improve Brief** — not always **Exit deliverable mode**). */
  private deliverableModeShell(): Locator {
    return this.page
      .locator('motion.div, div, section, main')
      .filter({ has: this.page.getByText(/My Deliverable Structure/i) })
      .filter({ has: this.page.getByRole('button', { name: /Improve Brief/i }) })
      .last();
  }

  private addThisAgentInStandardProjectPanel(): Locator {
    return this.selectStandardProjectOverlay().getByRole('button', { name: /Add This Agent/i });
  }

  private async isDeliverableModeVisible(projectName: string): Promise<boolean> {
    const structure = await this.page
      .getByText(/My Deliverable Structure/i)
      .first()
      .isVisible()
      .catch(() => false);
    const improveBrief = await this.page
      .getByRole('button', { name: /Improve Brief/i })
      .first()
      .isVisible()
      .catch(() => false);
    if (!structure || !improveBrief) {
      return false;
    }

    const escaped = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const agentTag = await this.page
      .getByText(new RegExp(`${escaped}|\\d+\\s+Agents`, 'i'))
      .first()
      .isVisible()
      .catch(() => false);
    return agentTag;
  }

  public async waitForDeliverableModeAfterAddAgent(projectName: string): Promise<void> {
    await test.step('Wait for deliverable mode after Add This Agent', async () => {
      await expect
        .poll(
          async () => {
            const modalClosed = !(await this.page
              .getByRole('heading', { name: /Select Standard Project/i })
              .isVisible()
              .catch(() => false));
            return modalClosed && (await this.isDeliverableModeVisible(projectName));
          },
          {
            timeout: DELIVERABLE_MODE_AFTER_ADD_AGENT_TIMEOUT_MS,
            intervals: [500, 1000, 2000],
            message: `Deliverable mode did not open after Add This Agent (expected "${projectName}" in structure)`,
          },
        )
        .toBe(true);

      await expect(this.deliverableModeShell()).toBeVisible({ timeout: 15_000 });
    });
  }

  /** Full settings sheet after send — **Generate deliverable** + **Geographical Scope** (not sidebar). */
  private deliverableSettingsPanel(): Locator {
    return this.page
      .locator('motion.div, main, form, div, section')
      .filter({ has: this.page.getByText(/Geographical Scope/i) })
      .filter({ has: this.page.getByText(/Work details/i) })
      .filter({ has: this.page.getByRole('button', { name: /Generate deliverable/i }) })
      .last();
  }

  private async isDeliverableSettingsSheetVisible(): Promise<boolean> {
    const geo = await this.page
      .getByText(/^Geographical Scope$/i)
      .first()
      .isVisible()
      .catch(() => false);
    const generate = await this.page
      .getByRole('button', { name: /Generate deliverable/i })
      .first()
      .isVisible()
      .catch(() => false);
    const workDetails = await this.page
      .getByText(/^Work details$/i)
      .first()
      .isVisible()
      .catch(() => false);
    return geo && generate && workDetails;
  }

  private workDetailsHeading(): Locator {
    return this.page.getByRole('heading', { name: /^Work details$/i });
  }

  /** Region under **Work details** heading (for assertions). */
  private workDetailsSection(): Locator {
    return this.workDetailsHeading().locator(
      'xpath=ancestor::*[.//input[@placeholder="Search..."]][1]',
    );
  }

  private scopeBoundariesHeading(): Locator {
    return this.page.getByRole('heading', { name: /^Scope & boundaries$/i });
  }

  /**
   * **+ Add** textboxes under Scope & boundaries (first = Geographical, second = Business).
   * Uses following-axis from heading — matches MCP/UI: two `textbox "+ Add"` siblings.
   */
  private scopeAddInput(columnLabel: 'Geographical Scope' | 'Business Scope'): Locator {
    const index = columnLabel === 'Geographical Scope' ? 0 : 1;
    return this.page.getByRole('textbox', { name: /^\+ Add$/i }).nth(index);
  }

  private scopeColumnLabel(columnLabel: 'Geographical Scope' | 'Business Scope'): Locator {
    return this.page.getByText(new RegExp(`^${columnLabel}`, 'i')).first();
  }

  private scopeTagRemoveButton(_columnLabel: 'Geographical Scope' | 'Business Scope', tag: string): Locator {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('button', { name: new RegExp(`^Remove ${escaped}$`, 'i') });
  }

  /** **Client Name** — first `Search...` after **Work details** (second is Project Name). */
  private clientNameSearchInput(): Locator {
    return this.workDetailsHeading()
      .locator('xpath=following::input[@placeholder="Search..."][1]')
      .or(this.deliverableSettingsPanel().getByPlaceholder('Search...').first());
  }

  /** Leave **Business Scope** / **+ Add** so **Client Name** search can receive focus. */
  private async releaseScopeFieldFocus(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    const workDetails = this.workDetailsHeading();
    if (await workDetails.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await workDetails.scrollIntoViewIfNeeded();
      await workDetails.click({ force: true });
      await this.page.waitForTimeout(300);
    }
  }

  /** Inline suggestions under **Client Name** (`button "automation"`, not `[role="option"]`). */
  private clientNameSuggestionsContainer(): Locator {
    return this.clientNameSearchInput().locator('xpath=following-sibling::*[1]');
  }

  private clientNameSuggestionButton(term: string): Locator {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.clientNameSuggestionsContainer()
      .getByRole('button', { name: new RegExp(`^${escaped}$`, 'i') })
      .first();
  }

  /**
   * Add one scope tag via **+ Add** (always clicks the field; skips only when Remove chip exists).
   */
  private async fillScopeTagInput(
    columnLabel: 'Geographical Scope' | 'Business Scope',
    value: string,
  ): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const field = this.scopeAddInput(columnLabel);
    const removeChip = this.scopeTagRemoveButton(columnLabel, trimmed);

    await this.scopeBoundariesHeading().scrollIntoViewIfNeeded();
    await expect(this.scopeColumnLabel(columnLabel)).toBeVisible({ timeout: 15_000 });
    await expect(field).toBeVisible({ timeout: 10_000 });

    if (await removeChip.isVisible().catch(() => false)) {
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await field.scrollIntoViewIfNeeded();
    await field.click();
    await field.fill('');
    await field.pressSequentially(trimmed, { delay: 50 });
    await field.press('Enter');

    await expect(removeChip).toBeVisible({ timeout: 10_000 });

    if (columnLabel === 'Business Scope') {
      await this.page.keyboard.press('Escape');
    }
  }

  private async fillScopeTags(
    columnLabel: 'Geographical Scope' | 'Business Scope',
    tags: string[],
  ): Promise<void> {
    for (const tag of tags) {
      const trimmed = tag.trim();
      if (trimmed) {
        await this.fillScopeTagInput(columnLabel, trimmed);
      }
    }
  }

  private async selectClientFromWorkDetailsSearch(term: string): Promise<void> {
    const search = term.trim();
    if (!search) {
      throw new Error('Client search term must be non-empty.');
    }

    await this.releaseScopeFieldFocus();

    const searchInput = this.clientNameSearchInput();

    await expect(this.workDetailsHeading()).toBeVisible({ timeout: 20_000 });
    await searchInput.scrollIntoViewIfNeeded();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await expect(searchInput).toBeEditable({ timeout: 10_000 });
    if (await this.isClientSelectedInWorkDetails(search)) {
      return;
    }

    await searchInput.click({ force: true });
    await searchInput.fill('');
    await searchInput.pressSequentially(search, { delay: 40 });

    const suggestion = this.clientNameSuggestionButton(search);
    const workDetailsSuggestion = this.workDetailsHeading()
      .locator('xpath=ancestor::*[1]')
      .getByRole('button', { name: new RegExp(`^${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
      .first();

    if (await suggestion.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await suggestion.click();
    } else if (await workDetailsSuggestion.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await workDetailsSuggestion.click();
    } else {
      await expect(suggestion).toBeVisible({ timeout: 15_000 });
      await suggestion.click();
    }

    await expect
      .poll(async () => this.isClientSelectedInWorkDetails(search), {
        timeout: 15_000,
        intervals: [300, 600, 1000],
        message: `Client "${search}" was not selected in Work details`,
      })
      .toBe(true);

    await searchInput.blur().catch(() => {});
    await this.page.waitForTimeout(300);
  }

  private async isClientSelectedInWorkDetails(search: string): Promise<boolean> {
    const re = new RegExp(`^${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const searchInput = this.clientNameSearchInput();
    const inputValue = (await searchInput.inputValue().catch(() => '')).trim();

    if (!re.test(inputValue)) {
      return false;
    }

    const suggestions = this.clientNameSuggestionsContainer();
    if (!(await suggestions.isVisible().catch(() => false))) {
      return true;
    }

    return (await this.clientNameSuggestionButton(search).count()) === 0;
  }

  private settingsStageTabButton(): Locator {
    return this.page
      .getByRole('button', { name: /2\.\s*Settings/i })
      .or(this.page.getByRole('button', { name: /^2$/ }))
      .or(this.page.getByText(/^2\.\s*Settings$/i))
      .first();
  }

  private async isSettingsFormReadyFast(): Promise<boolean> {
    const [deliverableType, generate] = await Promise.all([
      this.page
        .getByText(/^Deliverable Type/i)
        .first()
        .isVisible()
        .catch(() => false),
      this.page
        .getByRole('button', { name: /Generate deliverable/i })
        .first()
        .isVisible()
        .catch(() => false),
    ]);
    return deliverableType && generate;
  }

  private async isSettingsStageVisible(): Promise<boolean> {
    if (await this.isSettingsFormReadyFast()) {
      return true;
    }
    if (await this.workDetailsHeading().isVisible().catch(() => false)) {
      return true;
    }
    return await this.page
      .getByText(/^Project objectives and context/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  private async waitForSettingsFormReady(timeoutMs = 10_000): Promise<void> {
    await expect(this.page.getByText(/^Deliverable Type/i).first()).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(this.page.getByRole('button', { name: /Generate deliverable/i }).first()).toBeVisible({
      timeout: Math.min(timeoutMs, 8_000),
    });
    this.settingsFormReady = true;
  }

  /** Settings sheet opens after deliverable-mode send (poll — do not proceed until scope/client fields exist). */
  public async waitForDeliverableSettingsSheet(): Promise<void> {
    await test.step('Wait for deliverable settings sheet', async () => {
      if (this.settingsFormReady) {
        return;
      }

      if (await this.isSettingsFormReadyFast()) {
        await this.waitForSettingsFormReady(8_000);
        return;
      }

      await expect
        .poll(async () => this.isDeliverableSettingsSheetVisible(), {
          timeout: DELIVERABLE_SETTINGS_SHEET_TIMEOUT_MS,
          intervals: [200, 400, 800, 1500],
          message: 'Settings sheet never appeared after deliverable-mode submit',
        })
        .toBe(true);

      await this.waitForSettingsFormReady(15_000);
    });
  }

  /**
   * TC-010 — open **2. Settings** as soon as the stepper is visible (no heavy panel scan).
   */
  /** Close source/research side panels that block the deliverable stepper or Chat Assistant. */
  public async dismissBlockingDeliverablePanels(): Promise<void> {
    await test.step('Dismiss blocking side panels if open', async () => {
      await this.closeDeliverableSidePanelIfOpen(/^Source$/i);
      await this.closeDeliverableSidePanelIfOpen(/Discard Source/i);
      await this.closeDeliverableSidePanelIfOpen(/Checking for existing research/i);
      await this.dismissBlockingModalOverlays();
    });
  }

  /** Full-screen overlays (`fixed inset-0 z-50`) — storyline leave, tours, etc. */
  public async dismissBlockingModalOverlays(): Promise<void> {
    const storyline = this.page
      .getByRole('heading', { name: /Storyline Generation in Progress/i })
      .or(this.page.getByText(/Storyline Generation in Progress/i))
      .first();
    if (await storyline.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const proceed = this.page.getByRole('button', { name: /^Proceed$/i }).first();
      if (await proceed.isVisible().catch(() => false)) {
        await proceed.click({ force: true });
        await expect(storyline).not.toBeVisible({ timeout: 15_000 }).catch(() => undefined);
      }
    }

    const overlay = this.page.locator('motion.div.fixed.inset-0.z-50, div.fixed.inset-0.z-50').first();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (!(await overlay.isVisible({ timeout: 400 }).catch(() => false))) {
        return;
      }

      const dialog = this.page.getByRole('dialog').last();
      const actionBtn = dialog
        .getByRole('button', {
          name: /^(Proceed|Close|Cancel|Dismiss|Got it|OK|Continue|Skip|Not now|Back)$/i,
        })
        .first();
      if (await actionBtn.isVisible().catch(() => false)) {
        await actionBtn.click({ force: true });
        await this.page.waitForTimeout(400);
        continue;
      }

      const overlayClose = overlay
        .locator('button')
        .filter({ has: this.page.locator('svg') })
        .last();
      if (await overlayClose.isVisible().catch(() => false)) {
        await overlayClose.click({ force: true });
        await this.page.waitForTimeout(400);
        continue;
      }

      await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.page.waitForTimeout(400);
    }
  }

  /** Brief stage with side panels closed — Chat Assistant in the centered bottom bar. */
  public async prepareDeliverableViewForChatAssistant(): Promise<void> {
    await test.step('Prepare deliverable view for Chat Assistant', async () => {
      const onSettings = await this.page
        .getByRole('heading', { name: /^Work details$/i })
        .isVisible({ timeout: 300 })
        .catch(() => false);

      if (onSettings) {
        const briefTab = this.page
          .getByRole('button', { name: /1\.\s*Brief/i })
          .or(this.page.getByRole('button', { name: /^1$/ }))
          .first();
        if (await briefTab.isVisible({ timeout: 500 }).catch(() => false)) {
          await briefTab.click({ force: true });
          await this.page.waitForTimeout(400);
        }
      }

      const onOutput = await this.page
        .getByRole('button', { name: /^Export$/i })
        .isVisible({ timeout: 300 })
        .catch(() => false);
      if (onOutput) {
        const deliverableTab = this.page
          .getByRole('button', { name: /^3$/ })
          .or(this.page.getByText(/^3\.\s*Deliverable$/i))
          .first();
        if (await deliverableTab.isVisible({ timeout: 500 }).catch(() => false)) {
          await deliverableTab.click({ force: true });
          await this.page.waitForTimeout(400);
        }
      }

      await this.dismissBlockingDeliverablePanels();
    });
  }

  private async closeDeliverableSidePanelIfOpen(headingPattern: RegExp): Promise<void> {
    const heading = this.page.getByRole('heading', { name: headingPattern }).first();
    if (!(await heading.isVisible({ timeout: 300 }).catch(() => false))) {
      return;
    }

    if (/Discard Source/i.test(headingPattern.source)) {
      const back = this.page.getByRole('button', { name: /^Back$/i }).first();
      if (await back.isVisible().catch(() => false)) {
        await back.click({ force: true });
        await expect(heading).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
        return;
      }
    }

    const headerRow = heading.locator('xpath=ancestor::*[.//button][1]').first();
    const headerButtons = headerRow.getByRole('button');
    const count = await headerButtons.count();
    if (count > 0) {
      await headerButtons.nth(count - 1).click({ force: true });
      await expect(heading).not.toBeVisible({ timeout: 5_000 }).catch(() => {});
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => undefined);
    await expect(heading).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  private async clickSettingsStageControl(fast = false): Promise<void> {
    const tab2 = this.page.getByRole('button', { name: /^2$/ }).first();
    const tabTimeout = fast ? 2_000 : 15_000;
    if (await tab2.isVisible({ timeout: fast ? 1_500 : 3_000 }).catch(() => false)) {
      await tab2.click({ force: true, timeout: tabTimeout });
      return;
    }

    const settingsTab = this.settingsStageTabButton();
    if (fast) {
      await settingsTab.click({ force: true, timeout: 5_000 });
      return;
    }

    await expect(settingsTab).toBeVisible({ timeout: 15_000 });
    await settingsTab.click({ force: true, timeout: 10_000 });
  }

  private async waitForSettingsStageReady(fast = false): Promise<void> {
    const timeoutMs = fast ? 20_000 : DELIVERABLE_SETTINGS_SHEET_TIMEOUT_MS;
    const readyTimeout = fast ? 8_000 : 15_000;

    if (await this.isSettingsStageVisible()) {
      await this.waitForSettingsFormReady(readyTimeout).catch(() => {});
      return;
    }

    await expect
      .poll(async () => this.isSettingsStageVisible(), {
        timeout: timeoutMs,
        intervals: fast ? [100, 200, 300, 500, 800, 1200, 2000] : [200, 400, 800, 1500],
        message: 'Settings form did not appear',
      })
      .toBe(true);

    await this.waitForSettingsFormReady(readyTimeout);
  }

  /** @param fast — direct stepper click + short poll (export/loader flows from Brief). */
  public async goToSettingsStage(options?: { fast?: boolean }): Promise<void> {
    const fast = options?.fast === true;
    await test.step(fast ? 'Open Settings (fast)' : 'Open Settings stage', async () => {
      await this.dismissBlockingDeliverablePanels();

      if (await this.isSettingsFormReadyFast()) {
        this.settingsFormReady = true;
        return;
      }

      const objectivesVisible = await this.page
        .getByText(/^Project objectives and context/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (objectivesVisible) {
        this.settingsFormReady = true;
        return;
      }

      if (!fast && (await this.isDeliverableSettingsSheetVisible())) {
        this.settingsFormReady = true;
        return;
      }

      await this.clickSettingsStageControl(fast);
      try {
        if (fast) {
          await this.waitForSettingsStageReady(true);
        } else {
          await this.waitForDeliverableSettingsSheet();
        }
      } catch {
        await this.clickSettingsStageControl(false);
        await this.waitForDeliverableSettingsSheet();
      }
      this.settingsFormReady = true;
    });
  }

  public async isConfigureDeliverableBriefStage(): Promise<boolean> {
    return await this.page
      .getByRole('heading', { name: /Now Is Time To Deliver/i })
      .isVisible()
      .catch(() => false);
  }

  /** After **Add This Agent**: deliverable mode visible with agent in structure. */
  public async assertDeliverableModeReady(standardProjectName: string): Promise<void> {
    await this.waitForDeliverableModeAfterAddAgent(standardProjectName.trim());
  }

  /**
   * After **Generate deliverable**: stay on dashboard (Progress) or fail fast if redirected to create-project
   * without a linked client (MCP: wrong client → `/project` + Create New Project).
   */
  public async assertGenerationRouteReady(): Promise<void> {
    await test.step('Assert post-Generate route', async () => {
      await this.page.waitForTimeout(2000);

      const onProjectWizard = this.page.url().includes('/project');
      const createNewProject = this.page.getByRole('heading', { name: /Create New Project/i });

      if (onProjectWizard && (await createNewProject.isVisible().catch(() => false))) {
        throw new Error(
          'Generate redirected to Create New Project — select the automation client in Work details before Generate',
        );
      }
    });
  }

  public async fillDeliverableSettingsAndGenerate(details: DeliverableWorkDetailsInput): Promise<void> {
    await this.fillWorkDetailsAndGenerateDeliverable(details);
  }

  /** Stepper **2. Settings** on New deliverable / Configure Deliverable. */
  public async clickSettingsStageTab(): Promise<void> {
    await this.goToSettingsStage();
  }

  public async assertDeliverableBreadcrumbVisible(deliverableName: string): Promise<void> {
    const escaped = deliverableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');

    await test.step(`Assert deliverable open: ${deliverableName}`, async () => {
      await expect(
        this.page.getByRole('button', { name: re }).or(this.page.getByText(re)).first(),
      ).toBeVisible({ timeout: 20_000 });
    });
  }

  /** @deprecated Use {@link assertDeliverableBreadcrumbVisible} */
  public async assertNewDeliverableBreadcrumbVisible(): Promise<void> {
    await this.assertDeliverableBreadcrumbVisible('New deliverable');
  }

  private projectObjectivesTextarea(): Locator {
    return this.page
      .getByText(/^Project objectives and context/i)
      .first()
      .locator('xpath=following::textarea[1]');
  }

  private timeHorizonInput(): Locator {
    return this.page
      .getByRole('textbox', { name: /FY2026|next three years/i })
      .or(this.page.getByPlaceholder(/FY2026|Q1[\u2013-]Q3|next three years/i))
      .first();
  }

  private labeledDropdownTrigger(scope: Page | Locator, fieldLabel: string): Locator {
    const labelRe = new RegExp(`^${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    return scope
      .getByText(labelRe)
      .first()
      .locator(
        'xpath=parent::*//button[@aria-haspopup="listbox"] | parent::*//button[contains(@class,"rjsf-select-trigger")]',
      )
      .first();
  }

  /**
   * Ambition dropdowns (**Deliverable Type**, **Project Type**) — always open the menu and pick the option
   * so headed runs visibly interact with the field (no skip when value already matches).
   */
  private async selectAmbitionDropdown(
    fieldLabel: 'Deliverable Type' | 'Project Type',
    value: string,
  ): Promise<void> {
    const trimmed = value.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const valueRe = new RegExp(`^${escaped}$`, 'i');
    const trigger = this.labeledDropdownTrigger(this.page, fieldLabel);

    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.scrollIntoViewIfNeeded();
    await this.page.keyboard.press('Escape').catch(() => {});

    await trigger.click();
    const menu = this.page.locator('[role="listbox"]:visible').last();
    await expect(menu).toBeVisible({ timeout: 8_000 });
    await menu.locator('[role="option"]').filter({ hasText: valueRe }).first().click();
    await this.page.keyboard.press('Escape').catch(() => {});

    await expect(trigger).toHaveText(valueRe, { timeout: 8_000 });
  }

  private async selectLabeledDropdown(fieldLabel: string, value: string): Promise<void> {
    const trimmed = value.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const valueRe = new RegExp(`^${escaped}$`, 'i');
    const trigger = this.labeledDropdownTrigger(this.page, fieldLabel);

    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.scrollIntoViewIfNeeded();

    const current = (await trigger.innerText()).replace(/\s+/g, ' ').trim();
    if (!valueRe.test(current)) {
      await trigger.click();
      const menu = this.page.locator('[role="listbox"]:visible').last();
      await expect(menu).toBeVisible({ timeout: 8_000 });
      await menu.locator('[role="option"]').filter({ hasText: valueRe }).first().click();
      await this.page.keyboard.press('Escape').catch(() => {});
    }

    await expect(trigger).toHaveText(valueRe, { timeout: 8_000 });
  }

  private modeConsiderationField(): Locator {
    return this.page.getByLabel(/Mode Consideration/i).or(
      this.deliverableSettingsPanel().getByPlaceholder(/mode consideration/i),
    );
  }

  private projectNameSearchInput(): Locator {
    return this.page
      .getByText(/^Project Name/i)
      .first()
      .locator('xpath=following::input[@placeholder="Search..."][1]');
  }

  private deliverableNameInput(): Locator {
    return this.page
      .getByText(/^Deliverable Name/i)
      .first()
      .locator('xpath=following::input[1]');
  }

  private async fillSettingsTextInput(field: Locator, value: string): Promise<void> {
    const expected = value.trim();
    await field.scrollIntoViewIfNeeded();
    await expect(field).toBeVisible({ timeout: 10_000 });
    await field.click();
    await field.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await field.fill(expected);
    await this.syncReactInputValue(field, expected);
    await expect(field).toHaveValue(expected, { timeout: 8_000 });
  }

  private async fillTimeHorizon(value: string): Promise<void> {
    await this.fillSettingsTextInput(this.timeHorizonInput(), value);
  }

  public async uploadSettingsDocument(relativePath: string): Promise<void> {
    const sourceUpload = new DeliverableSourceUploadPage(this.page, this.testInfo);
    await sourceUpload.attachSourceAtSettings(relativePath, { waitForProcessing: false });
  }

  /**
   * **Work details** — client + project are required before **Generate deliverable** starts.
   * Generate can look enabled while client is still empty; always run this before clicking Generate.
   */
  public async ensureWorkDetailsForGenerate(
    clientSearchTerm: string,
    projectName: string,
  ): Promise<void> {
    await test.step('Ensure Work details — Client Name and Project Name', async () => {
      await this.waitForDeliverableSettingsSheet();
      await this.workDetailsHeading().scrollIntoViewIfNeeded();

      const client = clientSearchTerm.trim() || 'automation';
      const project = projectName.trim() || 'New project';

      await this.selectClientFromWorkDetailsSearch(client);
      await this.ensureProjectNameFilled(project);

      await expect
        .poll(async () => this.isClientSelectedInWorkDetails(client), {
          timeout: 20_000,
          intervals: [300, 600, 1000],
          message: `Client "${client}" must be selected in Work details before Generate deliverable`,
        })
        .toBe(true);
    });
  }

  /** Fill **Project Name** in Work details when empty (blocks **Generate deliverable**). */
  public async ensureProjectNameFilled(projectName: string): Promise<void> {
    await test.step(`Ensure Project Name is filled: ${projectName}`, async () => {
      await this.workDetailsHeading().scrollIntoViewIfNeeded();
      const field = this.projectNameSearchInput();
      await expect(field).toBeVisible({ timeout: 15_000 });

      const expected = projectName.trim();
      const current = (await field.inputValue().catch(() => '')).trim();
      if (current.length === 0) {
        await this.fillSettingsTextInput(field, expected);
        await expect(field).toHaveValue(expected, { timeout: 8_000 });
      }

      await expect
        .poll(async () => (await field.inputValue()).trim().length, {
          timeout: 8_000,
          message: 'Project Name must not be empty before Generate deliverable',
        })
        .toBeGreaterThan(0);
    });
  }

  private async observeStepPause(stepLabel: string, settleMs?: number): Promise<void> {
    const ms = settleMs ?? TC010_STEP_SETTLE_MS;
    if (ms <= 0) {
      return;
    }
    await test.step(`Observe (${ms / 1000}s): ${stepLabel}`, async () => {
      await this.page.waitForTimeout(ms);
    });
  }

  /** Work details — Client Name + Project Name (required before Generate). */
  public async ensureClientNameSelected(
    clientSearchTerm = 'automation',
    projectName = 'New project',
  ): Promise<void> {
    if (!(await this.workDetailsHeading().isVisible().catch(() => false))) {
      await this.goToSettingsStage({ fast: true });
    }
    await this.ensureWorkDetailsForGenerate(clientSearchTerm, projectName);
    const client = clientSearchTerm.trim() || 'automation';
    await expect(this.clientNameSearchInput(), 'Client Name must be filled').not.toHaveValue('', {
      timeout: 8_000,
    });
    await expect
      .poll(async () => this.isClientSelectedInWorkDetails(client), {
        timeout: 10_000,
        intervals: [200, 400, 800],
        message: `Client "${client}" must be selected`,
      })
      .toBe(true);
  }

  /**
   * Required fields for **Generate** without TC-010’s full form, document upload, or 2s observe pauses.
   */
  public async fillMinimalSettingsForGenerate(scenario: DeliverableNewSettingsScenario): Promise<void> {
    await test.step('Fill minimal Settings required for Generate', async () => {
      const client = scenario.clientSearchTerm ?? 'automation';
      const project = scenario.projectName ?? 'New project';
      await this.ensureClientNameSelected(client, project);

      const generateBtn = this.page.getByRole('button', { name: /Generate deliverable/i }).first();
      const clientReady = await this.isClientSelectedInWorkDetails(client);
      if ((await generateBtn.isEnabled().catch(() => false)) && clientReady) {
        return;
      }

      await this.scopeBoundariesHeading().scrollIntoViewIfNeeded();
      const geoTags =
        scenario.geographicalScopeTags?.length ?
          scenario.geographicalScopeTags
        : [scenario.geographicalScope];
      const businessTags =
        scenario.businessScopeTags?.length ?
          scenario.businessScopeTags
        : [scenario.businessScope];
      await this.fillScopeTags('Geographical Scope', geoTags);
      await this.fillScopeTags('Business Scope', businessTags);

      const objectives = this.projectObjectivesTextarea();
      if ((await objectives.inputValue().catch(() => '')).trim().length < 20) {
        await this.fillSettingsTextarea(objectives, scenario.projectObjectives);
      }
      await this.fillTimeHorizon(scenario.timeHorizon);

      await expect(generateBtn).toBeEnabled({ timeout: 30_000 });
    });
  }

  /** TC-010 — full Settings form (steps 2–13). */
  public async fillCompleteNewDeliverableSettings(scenario: DeliverableNewSettingsScenario): Promise<void> {
    const settle = scenario.stepSettleMs ?? TC010_STEP_SETTLE_MS;

    if (!this.settingsFormReady) {
      await this.waitForDeliverableSettingsSheet();
    }

    await this.page.getByRole('heading', { name: /^Ambition$/i }).scrollIntoViewIfNeeded();

    await test.step(`Deliverable Type: ${scenario.deliverableType}`, async () => {
      await this.selectAmbitionDropdown('Deliverable Type', scenario.deliverableType);
      await this.observeStepPause('Deliverable Type', settle);
    });

    await test.step(`Project Type: ${scenario.projectType}`, async () => {
      await this.selectAmbitionDropdown('Project Type', scenario.projectType);
      await this.observeStepPause('Project Type', settle);
    });

    await test.step('Project objectives and context (Goals)', async () => {
      const field = this.projectObjectivesTextarea();
      await field.scrollIntoViewIfNeeded();
      await this.fillSettingsTextarea(field, scenario.projectObjectives);
      await this.observeStepPause('Goals / objectives', settle);
    });

    await test.step(`Time horizon: ${scenario.timeHorizon}`, async () => {
      await this.fillTimeHorizon(scenario.timeHorizon);
      await this.observeStepPause('Time horizon', settle);
    });

    await test.step('Scroll to Scope & boundaries', async () => {
      await this.scopeBoundariesHeading().scrollIntoViewIfNeeded();
      await expect(this.scopeAddInput('Geographical Scope')).toBeVisible({ timeout: 15_000 });
      await expect(this.scopeAddInput('Business Scope')).toBeVisible({ timeout: 15_000 });
    });

    const geoTags =
      scenario.geographicalScopeTags?.length ?
        scenario.geographicalScopeTags
      : [scenario.geographicalScope];
    await test.step(`Geographical Scope: ${geoTags.join(', ')}`, async () => {
      await this.fillScopeTags('Geographical Scope', geoTags);
      await this.observeStepPause('Geographical Scope', settle);
    });

    const businessTags =
      scenario.businessScopeTags?.length ?
        scenario.businessScopeTags
      : [scenario.businessScope];
    await test.step(`Business Scope: ${businessTags.join(', ')}`, async () => {
      await this.fillScopeTags('Business Scope', businessTags);
      await this.observeStepPause('Business Scope', settle);
    });

    const mode = scenario.modeConsideration?.trim();
    if (mode) {
      await test.step(`Mode consideration: ${mode}`, async () => {
        const byLabel = this.page.getByText(/^Mode consideration/i).first();
        if (await byLabel.isVisible().catch(() => false)) {
          const field = byLabel.locator('xpath=following::textarea[1] | following::input[1]').first();
          await this.fillSettingsTextInput(field, mode);
        } else {
          const field = this.modeConsiderationField();
          if (await field.first().isVisible().catch(() => false)) {
            await this.fillSettingsTextInput(field.first(), mode);
          }
        }
        await this.observeStepPause('Mode consideration', settle);
      });
    }

    await test.step('Upload document', async () => {
      await this.uploadSettingsDocument(scenario.documentPath);
      await this.observeStepPause('Document upload', settle);
    });

    await test.step(`Client Name: ${scenario.clientSearchTerm ?? 'automation'}`, async () => {
      await this.selectClientFromWorkDetailsSearch(scenario.clientSearchTerm?.trim() || 'automation');
      await this.observeStepPause('Client Name', settle);
    });

    await test.step(`Deliverable Language: ${scenario.deliverableLanguage}`, async () => {
      await this.selectLabeledDropdown('Deliverable Language', scenario.deliverableLanguage);
      await this.observeStepPause('Deliverable Language', settle);
    });

    await test.step(`Project Name: ${scenario.projectName}`, async () => {
      await this.workDetailsHeading().scrollIntoViewIfNeeded();
      await this.fillSettingsTextInput(this.projectNameSearchInput(), scenario.projectName);
      await this.observeStepPause('Project Name', settle);
    });

    await test.step(`Deliverable Name: ${scenario.deliverableName}`, async () => {
      await this.fillSettingsTextInput(this.deliverableNameInput(), scenario.deliverableName);
      await this.observeStepPause('Deliverable Name', settle);
    });

    await test.step('Verify all Settings fields', async () => {
      await this.assertNewDeliverableSettingsFilled(scenario);
    });
  }

  /** Assert every Settings field matches scenario data (fail if any value missing). */
  public async assertNewDeliverableSettingsFilled(scenario: DeliverableNewSettingsScenario): Promise<void> {
    await test.step('Assert Settings form values', async () => {
      await expect(this.labeledDropdownTrigger(this.page, 'Deliverable Type')).toHaveText(
        new RegExp(`^${scenario.deliverableType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      );
      await expect(this.labeledDropdownTrigger(this.page, 'Project Type')).toHaveText(
        new RegExp(`^${scenario.projectType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      );
      await expect(this.projectObjectivesTextarea()).toHaveValue(scenario.projectObjectives.trim());
      await expect(this.timeHorizonInput()).toHaveValue(scenario.timeHorizon.trim());

      const geoTags =
        scenario.geographicalScopeTags?.length ?
          scenario.geographicalScopeTags
        : [scenario.geographicalScope];
      for (const tag of geoTags) {
        await expect(this.scopeTagRemoveButton('Geographical Scope', tag.trim())).toBeVisible();
      }

      const businessTags =
        scenario.businessScopeTags?.length ?
          scenario.businessScopeTags
        : [scenario.businessScope];
      for (const tag of businessTags) {
        await expect(this.scopeTagRemoveButton('Business Scope', tag.trim())).toBeVisible();
      }

      await expect(this.clientNameSearchInput()).toHaveValue(
        new RegExp(`^${scenario.clientSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      );
      await expect(this.labeledDropdownTrigger(this.page, 'Deliverable Language')).toHaveText(
        new RegExp(`^${scenario.deliverableLanguage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      );
      await expect(this.projectNameSearchInput()).toHaveValue(scenario.projectName.trim());
      await expect(this.deliverableNameInput()).toHaveValue(scenario.deliverableName.trim());
    });
  }

  public async clickGenerateDeliverable(settleMs?: number): Promise<void> {
    await test.step('Click Generate deliverable', async () => {
      await this.observeStepPause('before Generate deliverable', settleMs);
      const generateBtn = this.locators.generateDeliverableButton.locator;
      await expect(generateBtn).toBeVisible({ timeout: 15_000 });
      await expect(generateBtn).toBeEnabled({ timeout: 15_000 });
      await this.actions.click(this.locators.generateDeliverableButton);
      await this.actions.waitForNetworkIdle();
      await this.assertGenerationRouteReady();
      await this.stageNavigationPage().navigateToDeliverableStageDirect();
    });
  }

  public async fillWorkDetailsAndGenerateDeliverable(details: DeliverableWorkDetailsInput): Promise<void> {
    await test.step('Deliverable settings: scope, client, Generate deliverable', async () => {
      await test.step(`Geographical scope: ${details.geographicalScope}`, async () => {
        await this.fillScopeTagInput('Geographical Scope', details.geographicalScope);
      });

      await test.step(`Business scope: ${details.businessScope}`, async () => {
        await this.fillScopeTagInput('Business Scope', details.businessScope);
      });

      await test.step(`Work details — Client Name: search "${details.clientSearchTerm}"`, async () => {
        await this.selectClientFromWorkDetailsSearch(details.clientSearchTerm);
      });

      await this.clickGenerateDeliverable();
    });
  }

  /** TC-010 — settings form + Generate (no Progress wait). */
  public async runNewDeliverableSettingsAndGenerate(scenario: DeliverableNewSettingsScenario): Promise<void> {
    const settle = scenario.stepSettleMs ?? TC010_STEP_SETTLE_MS;
    await this.fillCompleteNewDeliverableSettings(scenario);
    await this.clickGenerateDeliverable(settle);
    await this.observeStepPause('after Generate deliverable click', settle);
  }

  private workDetailsFromScenario(scenario: DeliverableFlowScenario): DeliverableWorkDetailsInput {
    return {
      geographicalScope: scenario.geographicalScope?.trim() || 'geographic',
      businessScope: scenario.businessScope?.trim() || 'business',
      clientSearchTerm: scenario.clientSearchTerm?.trim() || 'automation',
    };
  }

  /** Black send control in deliverable mode (scoped to shell — not dashboard Submit). */
  private deliverableModeSubmitButton(): Locator {
    const shell = this.deliverableModeShell();

    return shell
      .getByRole('button', { name: /Improve Brief/i })
      .locator('xpath=following-sibling::button[1]')
      .or(shell.locator('button:has(svg.lucide-send)'))
      .or(shell.locator('button:has(svg.lucide-paper-plane)'))
      .first();
  }

  public async submitDeliverableFromDeliverableMode(): Promise<void> {
    await test.step('Submit deliverable in deliverable mode and open settings', async () => {
      await expect(this.deliverableModeShell()).toBeVisible({ timeout: 30_000 });

      const submit = this.deliverableModeSubmitButton();
      await expect(submit).toBeVisible({ timeout: 20_000 });
      await expect(submit).toBeEnabled({ timeout: 15_000 });
      await submit.scrollIntoViewIfNeeded();
      await submit.click({ timeout: 15_000 });

      await this.waitForDeliverableSettingsSheet();
    });
  }

  /** Modal shell that contains both the heading and project card buttons (verified: shallow `filter(has: heading)` misses cards). */
  private selectStandardProjectOverlay(): Locator {
    return this.page
      .getByRole('heading', { name: /Select Standard Project/i })
      .locator(
        'xpath=ancestor::div[contains(@class,"rounded-xl") and contains(@class,"shadow-2xl")][1]',
      )
      .or(
        this.page
          .locator('[role="dialog"], [aria-modal="true"]')
          .filter({ hasText: /Select Standard Project/i }),
      );
  }

  /** Project card — must be resolved on `page` (panel-scoped xpath returns 0). */
  private standardProjectCard(projectName: string): Locator {
    const escaped = projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleRe = new RegExp(`^${escaped}$`, 'i');

    return this.page
      .getByRole('button', { name: new RegExp(`${escaped}.*Defining`, 'i') })
      .or(this.page.getByRole('button', { name: new RegExp(`\\d+\\s+Agents\\s+${escaped}`, 'i') }))
      .or(this.page.locator(`xpath=${standardProjectCardByTitleXpath(projectName)}`))
      .or(this.page.locator(`xpath=${standardProjectCardButtonXpath(projectName)}`))
      .or(
        this.page
          .getByRole('button')
          .filter({ has: this.page.getByRole('heading', { level: 4, name: titleRe }) }),
      )
      .first();
  }

  private async waitForStandardProjectCardsLoaded(projectName: string): Promise<void> {
    await test.step('Wait for standard project cards to load', async () => {
      await expect(this.selectStandardProjectOverlay()).toBeVisible({ timeout: 45_000 });
      await this.page
        .getByRole('heading', { name: /Select Standard Project/i })
        .waitFor({ state: 'visible', timeout: 30_000 });
      await this.page.getByPlaceholder(/Search agent name/i).waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
      await this.page.waitForTimeout(STANDARD_PROJECT_CARDS_SETTLE_MS);

      const card = this.standardProjectCard(projectName);
      await expect(card).toBeVisible({ timeout: 45_000 });
      await expect(card).toBeEnabled({ timeout: 15_000 });
    });
  }

  private async clickStandardProjectCardUntilSelected(projectName: string): Promise<void> {
    const addBtn = this.addThisAgentInStandardProjectPanel();
    const card = this.standardProjectCard(projectName);

    await expect
      .poll(
        async () => {
          if (await addBtn.isEnabled().catch(() => false)) {
            return true;
          }

          await card.scrollIntoViewIfNeeded();
          await card.click({ timeout: 10_000 });
          await this.page.waitForTimeout(300);

          if (await addBtn.isEnabled().catch(() => false)) {
            return true;
          }

          await card.evaluate((btn: HTMLButtonElement) => btn.click());
          await this.page.waitForTimeout(300);
          return await addBtn.isEnabled().catch(() => false);
        },
        {
          timeout: 45_000,
          intervals: [500, 1000, 1500, 2000],
          message: `Timed out selecting standard project "${projectName}" — Add This Agent never enabled`,
        },
      )
      .toBe(true);
  }

  /**
   * **Select Standard Project** panel: choose a project card (e.g. **AI Strategy**), then **Add This Agent**.
   */
  public async selectStandardProjectCard(projectName: string): Promise<void> {
    const name = projectName.trim();
    if (!name) {
      throw new Error('Standard project name must be non-empty.');
    }

    await test.step(`Select standard project "${name}" and confirm`, async () => {
      await this.waitForStandardProjectCardsLoaded(name);

      await test.step(`Click "${name}" project card`, async () => {
        await this.clickStandardProjectCardUntilSelected(name);
      });

      await test.step('Click Add This Agent', async () => {
        const addBtn = this.addThisAgentInStandardProjectPanel();
        await expect(addBtn).toBeEnabled({ timeout: 15_000 });
        await addBtn.click();
        await this.waitForDeliverableModeAfterAddAgent(name);
      });
    });
  }

  public async waitForDashboardHomePrompt(): Promise<void> {
    await test.step('Wait for dashboard home prompt', async () => {
      await expect(this.page.getByRole('heading', { name: /Good (Morning|Afternoon|Evening)/i })).toBeVisible({
        timeout: 45_000,
      });
      await this.locators.dashboardPromptTextarea.locator.waitFor({ state: 'visible', timeout: 30_000 });
      await expect(this.locators.buildDeliverableButton.locator).toBeVisible({ timeout: 15_000 });
    });
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

  /** Goals / brief textareas — avoid char-by-char typing for long objectives. */
  private async fillSettingsTextarea(field: Locator, value: string): Promise<void> {
    const expected = value.trim();
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await field.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await field.fill(expected);
    await this.syncReactInputValue(field, expected);

    await expect
      .poll(async () => (await field.inputValue()).trim(), {
        timeout: 8_000,
        intervals: [100, 200, 400],
        message: 'Settings textarea value did not sync after fill',
      })
      .toBe(expected);
  }

  private async fillPromptWithReactSync(field: Locator, value: string): Promise<void> {
    await this.fillSettingsTextarea(field, value);
  }

  /** Steps 1–2: home prompt + **Build a Deliverable**. */
  public async runDashboardBriefAndBuild(scenario: DeliverableFlowScenario): Promise<void> {
    const trimmed = scenario.deliverableBrief?.trim();
    if (!trimmed) {
      throw new Error('Deliverable brief must be non-empty.');
    }

    await this.waitForDashboardHomePrompt();

    await test.step('Enter prompt in dashboard textarea', async () => {
      const field = this.locators.dashboardPromptTextarea.locator;
      await field.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(BRIEF_ENTRY_SETTLE_MS);
      await this.fillPromptWithReactSync(field, trimmed);
      await expect(field).toHaveValue(trimmed, { timeout: 10_000 });
    });

    await test.step('Click Build a Deliverable', async () => {
      const buildBtn = this.locators.buildDeliverableButton.locator;
      await expect(buildBtn).toBeEnabled({ timeout: 15_000 });
      await this.actions.click(this.locators.buildDeliverableButton);
      await this.actions.waitForNetworkIdle();
    });
  }

  /** Steps 3–4: **Select Standard Project** card → **Add This Agent**. */
  public async runSelectStandardProjectAndAddAgent(standardProjectName: string): Promise<void> {
    await this.selectStandardProjectCard(standardProjectName);
  }

  /** Step 5: deliverable mode — send → wait for settings sheet (mode already open after step 4). */
  public async runDeliverableModeSubmit(standardProjectName: string): Promise<void> {
    await this.submitDeliverableFromDeliverableMode();
  }

  /** Step 6–8 only (settings already open). */
  public async runDeliverableSettingsForm(scenario: DeliverableFlowScenario): Promise<void> {
    await this.waitForDeliverableSettingsSheet();
    await this.fillWorkDetailsAndGenerateDeliverable(this.workDetailsFromScenario(scenario));
  }

  /**
   * TC-008 steps 1–6: dashboard brief → standard project → deliverable mode → settings
   * (scope, client, project, deliverable name). Does not click **Generate**.
   */
  public async runDashboardDeliverableCreateThroughSettings(
    input: DeliverableFlowScenario & { projectName: string; deliverableName: string },
  ): Promise<void> {
    const standardProject = input.standardProjectName?.trim() || 'AI Strategy';

    await this.runDashboardBriefAndBuild(input);
    await this.runSelectStandardProjectAndAddAgent(standardProject);
    await this.runDeliverableModeSubmit(standardProject);
    await this.fillSettingsScopeClientProjectAndName({
      ...this.workDetailsFromScenario(input),
      projectName: input.projectName.trim(),
      deliverableName: input.deliverableName.trim(),
    });
  }

  /**
   * TC-008 steps 1–10 (through Progress complete): settings + **Generate deliverable** + wait.
   */
  public async runDashboardDeliverableCreateWithGeneration(
    input: DeliverableFlowScenario & { projectName: string; deliverableName: string },
  ): Promise<void> {
    await this.runDashboardDeliverableCreateThroughSettings(input);
    await this.clickGenerateDeliverable();
    await this.runWaitForGenerationComplete(input);
  }

  /** After generation: deliverable output is available (Export or **3. Deliverable** stepper). */
  public async assertGeneratedDeliverableReadable(): Promise<void> {
    await test.step('Assert generated deliverable is readable in main view', async () => {
      const readable = this.page
        .getByRole('button', { name: /^Export$/i })
        .or(this.page.getByRole('button', { name: /3\.\s*Deliverable/i }))
        .or(this.page.getByRole('button', { name: /^3$/ }));
      await expect(readable.first()).toBeVisible({ timeout: 60_000 });
    });
  }

  private async fillSettingsScopeClientProjectAndName(
    details: DeliverableWorkDetailsInput & { projectName: string; deliverableName: string },
  ): Promise<void> {
    await test.step('Settings: scope, client, project, deliverable name (no Generate)', async () => {
      await this.waitForDeliverableSettingsSheet();

      await test.step(`Geographical scope: ${details.geographicalScope}`, async () => {
        await this.fillScopeTagInput('Geographical Scope', details.geographicalScope);
      });

      await test.step(`Business scope: ${details.businessScope}`, async () => {
        await this.fillScopeTagInput('Business Scope', details.businessScope);
      });

      await test.step(`Work details — Client Name: search "${details.clientSearchTerm}"`, async () => {
        await this.selectClientFromWorkDetailsSearch(details.clientSearchTerm);
      });

      await this.ensureProjectNameFilled(details.projectName);

      await test.step(`Deliverable Name: ${details.deliverableName}`, async () => {
        const nameField = this.deliverableNameInput();
        await nameField.scrollIntoViewIfNeeded();
        await this.fillSettingsTextInput(nameField, details.deliverableName);
      });
    });
  }

  /** Steps 6–8: settings sheet — scope, client, **Generate deliverable**. */
  public async runDeliverableSettingsAndGenerate(scenario: DeliverableFlowScenario): Promise<void> {
    await this.runDeliverableSettingsForm(scenario);
  }

  /** Steps 9–10: wait for **Progress** complete (~10–18 min on staging). */
  public async runWaitForGenerationComplete(scenario: DeliverableFlowScenario): Promise<void> {
    const generationTimeoutMs =
      scenario.generationProgressTimeoutMs ?? DELIVERABLE_GENERATION_PROGRESS_TIMEOUT_MS;
    await this.waitForBriefGenerationProgressDone(generationTimeoutMs);
  }

  /** Full TC-008 flow (single entry point). */
  public async enterBriefAndBuildDeliverable(scenario: DeliverableFlowScenario): Promise<void> {
    const standardProjectName = scenario.standardProjectName?.trim() || 'AI Strategy';

    await this.runDashboardBriefAndBuild(scenario);
    await this.runSelectStandardProjectAndAddAgent(standardProjectName);
    await this.runDeliverableModeSubmit(standardProjectName);
    await this.runDeliverableSettingsAndGenerate(scenario);
    await this.runWaitForGenerationComplete(scenario);
  }

  /** True while Progress / spinner / generating UI is active (Settings navigation typically blocked). */
  public async isDeliverableGenerationInProgress(): Promise<boolean> {
    return this.stageNavigationPage().isDeliverableGenerationInProgress();
  }

  /** True when **3. Deliverable** is green or **Export** is enabled (strict — not Brief-only signals). */
  public async isDeliverableGenerationComplete(): Promise<boolean> {
    return this.stageNavigationPage().isDeliverableGenerationComplete();
  }

  private stageNavigationPage(): DeliverableStageNavigationPage {
    return new DeliverableStageNavigationPage(this.page, this.testInfo);
  }

  /** Confirm reset after **Generate deliverable** when a storyline already exists. */
  private async confirmResetAfterGenerateIfPrompted(timeoutMs = 25_000): Promise<boolean> {
    const resetStorylineBtn = this.page.getByRole('button', { name: /Reset storyline/i });
    const resetAndRegenerateBtn = this.page.getByRole('button', { name: /Reset and Regenerate/i });

    const resetHeading = this.page.getByRole('heading', { name: /Reset current storyline/i });
    const modalVisible = await resetHeading.isVisible({ timeout: timeoutMs }).catch(() => false);

    if (modalVisible && (await resetStorylineBtn.isVisible().catch(() => false))) {
      await resetStorylineBtn.click({ force: true });
      await expect(resetHeading).not.toBeVisible({ timeout: 15_000 }).catch(() => undefined);
      return true;
    }

    if (await resetStorylineBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await resetStorylineBtn.click({ force: true });
      return true;
    }

    if (await resetAndRegenerateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await resetAndRegenerateBtn.click({ force: true });
      return true;
    }

    const dialogReset = this.page
      .getByRole('dialog')
      .getByRole('button', { name: /Reset storyline|Reset and Regenerate/i })
      .first();
    if (await dialogReset.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await dialogReset.click({ force: true });
      return true;
    }

    return false;
  }

  private async isGenerateActionAcknowledged(): Promise<boolean> {
    if (await this.confirmResetAfterGenerateIfPrompted(1_500)) {
      return true;
    }
    if (await this.stageNavigationPage().isDeliverableGenerationInProgress()) {
      return true;
    }

    const exportBtn = this.page.getByRole('button', { name: /^Export$/i }).first();
    if (await exportBtn.isVisible().catch(() => false)) {
      const enabled = await exportBtn.isEnabled().catch(() => false);
      if (!enabled) {
        return true;
      }
    }

    return await this.page
      .getByText(/Reset current storyline|regenerat|updating.*deliverable|generating.*deliverable/i)
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** After **Generate deliverable** on an existing storyline: reset modal or generation UI. */
  public async clickGenerateWithResetIfPrompted(): Promise<void> {
    await test.step('Generate deliverable (confirm reset if prompted)', async () => {
      await this.dismissBlockingDeliverablePanels();

      const generateBtn = this.page.getByRole('button', { name: /Generate deliverable/i }).first();
      await expect(generateBtn).toBeVisible({ timeout: 15_000 });
      await expect(generateBtn).toBeEnabled({ timeout: 30_000 });
      await generateBtn.scrollIntoViewIfNeeded();
      await generateBtn.click({ force: true });

      if (await this.confirmResetAfterGenerateIfPrompted(25_000)) {
        return;
      }

      await expect
        .poll(async () => this.isGenerateActionAcknowledged(), {
          timeout: 90_000,
          intervals: [500, 1000, 2000, 3000, 5000],
          message:
            'Reset storyline / Reset and Regenerate or generation progress should appear after Generate',
        })
        .toBe(true);
    });
  }

  /**
   * After **Generate Deliverable**: wait for generation to start, then **3. Deliverable** green or enabled Export (~10–18 min on staging).
   * Rejects stale pre-Generate completion (visible-only Export / green Brief).
   */
  public async waitForBriefGenerationProgressDone(
    timeoutMs = DELIVERABLE_GENERATION_PROGRESS_TIMEOUT_MS,
  ): Promise<void> {
    await test.step(`Wait for deliverable generation — Export enabled or 3. Deliverable green (up to ${Math.round(timeoutMs / 60_000)} min)`, async () => {
      const startedAt = Date.now();
      const stageNav = this.stageNavigationPage();
      const alreadyCompleteAtStart = await stageNav.isDeliverableGenerationComplete();
      const startedDeadline = Date.now() + DELIVERABLE_GENERATION_STARTED_TIMEOUT_MS;
      let sawGenerationActive = false;
      let sawStorylineModules = false;
      let pollCount = 0;
      let lastPollDiagnostics: Record<string, unknown> = {};

      const keyInitiativesDuringGen = this.page.locator(
        'xpath=//span[normalize-space()="Key Initiatives"]',
      );

      await this.dismissBlockingDeliverablePanels();

      await test.step('Wait for generation to complete', async () => {
        try {
          await expect
            .poll(
              async () => {
              pollCount += 1;

              if (await keyInitiativesDuringGen.isVisible().catch(() => false)) {
                sawStorylineModules = true;
                sawGenerationActive = true;
              }
              if (await stageNav.isDeliverableGenerationInProgress()) {
                sawGenerationActive = true;
              }

              if (await stageNav.isExportReady()) {
                if (alreadyCompleteAtStart && !sawGenerationActive && Date.now() < startedDeadline) {
                  return false;
                }
                return true;
              }

              if (await stageNav.isDeliverableGenerationComplete()) {
                if (alreadyCompleteAtStart && !sawGenerationActive && !sawStorylineModules) {
                  return false;
                }
                if (sawGenerationActive || sawStorylineModules || Date.now() >= startedDeadline) {
                  return true;
                }
                return false;
              }

              if (pollCount % 3 === 0) {
                await stageNav.navigateToDeliverableStageDirect();
              }

              lastPollDiagnostics = {
                pollCount,
                sawGenerationActive,
                sawStorylineModules,
                alreadyCompleteAtStart,
                exportVisible: await stageNav.exportButton().isVisible().catch(() => false),
                exportEnabled: await stageNav.isExportReady(),
                deliverableGreen: await stageNav
                  .deliverableStageGreenComplete()
                  .isVisible()
                  .catch(() => false),
                spinner: await stageNav.hasActiveGenerationSpinner(),
                inProgress: await stageNav.isDeliverableGenerationInProgress(),
              };

              return false;
            },
            {
              timeout: timeoutMs,
              intervals: [3000, 5000, 10_000, 15_000, 30_000],
              message:
                'Deliverable generation should complete (3. Deliverable green or Export enabled after Progress)',
            },
            )
            .toBe(true);
        } catch (error) {
          await this.testInfo.attach('brief-generation-failed', {
            body: JSON.stringify(
              {
                sawGenerationActive,
                sawStorylineModules,
                alreadyCompleteAtStart,
                pollIterations: pollCount,
                lastPollDiagnostics,
                exportEnabled: await stageNav.isExportReady(),
              },
              null,
              2,
            ),
            contentType: 'application/json',
          });
          throw error;
        }
      });

      if (!(await stageNav.isDeliverableGenerationComplete())) {
        await stageNav.navigateToDeliverableStageDirect();
      }

      const deliverableGreen = await stageNav
        .deliverableStageGreenComplete()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!deliverableGreen && !(await stageNav.isExportReady())) {
        await expect(stageNav.exportButton()).toBeEnabled({ timeout: 15_000 });
      }

      const elapsedMs = Date.now() - startedAt;
      await this.testInfo.attach('brief-generation-duration', {
        body: JSON.stringify(
          {
            elapsedMs,
            elapsedMinutes: Math.round((elapsedMs / 60_000) * 10) / 10,
            sawGenerationActive,
            sawStorylineModules,
            alreadyCompleteAtStart,
            deliverableStepGreen: deliverableGreen,
            exportEnabled: await stageNav.isExportReady(),
            pollIterations: pollCount,
            lastPollDiagnostics,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      await this.actions.waitForNetworkIdle();
    });
  }

  /** @deprecated Use {@link enterBriefAndBuildDeliverable} — matches home dashboard UI, not sidebar wizard. */
  public async createDeliverableFromDashboard(brief: string): Promise<void> {
    await this.enterBriefAndBuildDeliverable({ deliverableBrief: brief });
  }
}
