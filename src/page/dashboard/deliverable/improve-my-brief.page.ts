import { BRIEF_ENTRY_SETTLE_MS } from '@data/dashboard/deliverable/deliverable-new-settings.timeouts';
import {
  BRIEF_SUBMIT_GENERATION_TIMEOUT_MS,
  GENERATE_BRIEF_APPLY_TIMEOUT_MS,
  IMPROVE_BRIEF_AI_TIMEOUT_MS,
} from '@data/dashboard/deliverable/improve-my-brief.timeouts';
import type { BriefImprovementIntent } from '@interface/dashboard/improve-my-brief.interface';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { expect, Locator, Page, test, TestInfo } from '@playwright/test';
import {
  assertBriefMatchesIntent,
  assertImprovedRelatesToOriginal,
  countMatchedThemes,
  normalizeBriefText,
} from '@utilities/helpers/brief-intent.utils';

export interface BriefComparisonSnapshot {
  original: string;
  improved: string;
}

/** Staging sometimes shows **Failed to improve brief** — caller may retry **Improve My Brief**. */
export class ImproveBriefFailedError extends Error {
  public constructor(message = 'Failed to improve brief') {
    super(message);
    this.name = 'ImproveBriefFailedError';
  }
}

/** No loading / busy state after click — caller may click **Improve My Brief** again. */
export class ImproveBriefNotStartedError extends Error {
  public constructor(message = 'AI refinement did not start after Improve My Brief') {
    super(message);
    this.name = 'ImproveBriefNotStartedError';
  }
}

const IMPROVE_BRIEF_START_TIMEOUT_MS = 25_000;

/**
 * TC-012 — **1. Brief** → **Improve My Brief** → **Submit** → **Generating your new brief…** → continue (before settings complete).
 * Based on [Jam 7b2bcf0b](https://jam.dev/c/7b2bcf0b-a8c6-44b2-95e6-6c5c7508dd81).
 */
export class ImproveMyBriefPage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly deliverablePage: DeliverablePage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.deliverablePage = new DeliverablePage(page, testInfo);
  }

  private myBriefStageTab(): Locator {
    return this.page
      .getByRole('button', { name: /1\.\s*Brief/i })
      .or(this.page.getByRole('button', { name: /^1$/ }))
      .or(this.page.getByRole('button', { name: /^My Brief$/i }))
      .first();
  }

  private briefStageAnchor(): Locator {
    return this.page
      .getByRole('heading', { name: /Now Is Time To Deliver/i })
      .or(this.page.getByText(/Describe the deliverable you need/i))
      .first();
  }

  /** Brief body is a `textbox` or `textarea` depending on deliverable state. */
  private briefEditor(): Locator {
    const excludeSearch = this.page.getByPlaceholder(/Search Clients/i);
    return this.page
      .locator('main textarea:visible, form textarea:visible')
      .filter({ hasNot: excludeSearch })
      .or(
        this.page
          .locator('main')
          .getByRole('textbox')
          .filter({ hasNot: excludeSearch }),
      )
      .or(
        this.page.getByPlaceholder(
          /business context|Type something here|market entry|deliverable you need/i,
        ),
      )
      .first();
  }

  private async isOnBriefStage(): Promise<boolean> {
    const anchorVisible = await this.briefStageAnchor().isVisible().catch(() => false);
    if (!anchorVisible) {
      return false;
    }
    const editorVisible = await this.briefEditor().isVisible().catch(() => false);
    const improveVisible = await this.improveMyBriefButton().isVisible().catch(() => false);
    return editorVisible || improveVisible;
  }

  private improveMyBriefButton(): Locator {
    return this.page.getByRole('button', { name: /Improve My Brief/i });
  }

  /** Brief card — **Attach a file** (left) + send/submit (right, paper plane). */
  private briefInputCard(): Locator {
    return this.page
      .getByRole('button', { name: /Attach a file/i })
      .locator('xpath=ancestor::*[self::motion.div or self::motion.div or self::div][1]');
  }

  private briefSubmitButton(): Locator {
    const card = this.briefInputCard();
    return card
      .locator('button:has(svg.lucide-send), button:has(svg.lucide-paper-plane)')
      .or(
        this.briefEditor().locator(
          'xpath=ancestor::*[.//button[normalize-space()="Attach a file"]][1]//button[contains(@class,"rounded-full") or .//svg]',
        ),
      )
      .last();
  }

  private generatingNewBriefSection(): Locator {
    return this.page.getByText(/Generating your new brief/i).first();
  }

  private settingsStageAnchor(): Locator {
    return this.page
      .getByRole('heading', { name: /Configure Deliverable/i })
      .or(this.page.getByRole('heading', { name: /^Ambition$/i }))
      .or(this.page.getByText(/^Geographical Scope$/i))
      .or(this.page.getByText(/Small adaptation applied/i))
      .first();
  }

  private generateBriefButton(): Locator {
    return this.page
      .getByRole('button', { name: /^Generate Brief$/i })
      .or(this.page.getByRole('button', { name: /Generate Brief/i }));
  }

  private aiLoadingIndicator(): Locator {
    return this.page
      .getByText(/^Improving/i)
      .or(this.page.getByText(/Generating your new brief/i))
      .or(this.page.getByText(/Reading brief/i))
      .or(this.page.getByText(/Refining|Working on your brief|Please wait/i))
      .first();
  }

  private improveBriefFailedMessage(): Locator {
    return this.page.getByText(/Failed to improve brief/i).first();
  }

  public async isImproveBriefFailed(): Promise<boolean> {
    return await this.improveBriefFailedMessage().isVisible().catch(() => false);
  }

  private async throwIfImproveBriefFailed(): Promise<void> {
    if ((await this.isImproveBriefFailed()) && !(await this.isAiLoading())) {
      throw new ImproveBriefFailedError();
    }
  }

  private async isAiLoading(): Promise<boolean> {
    if (await this.aiLoadingIndicator().isVisible().catch(() => false)) {
      return true;
    }
    return await this.page
      .locator('main [class*="animate-spin"], main [aria-busy="true"]')
      .first()
      .isVisible()
      .catch(() => false);
  }

  private async captureRefinementText(): Promise<string> {
    if (await this.settingsGoalsField().isVisible().catch(() => false)) {
      return (await this.settingsGoalsField().inputValue()).trim();
    }
    return (await this.captureBriefTextareaValue()).trim();
  }

  private async isRefinementReady(baselineText: string): Promise<boolean> {
    if (await this.isAiLoading()) {
      return false;
    }
    if (await this.isImproveBriefFailed()) {
      return false;
    }

    if (await this.generateBriefButton().isVisible().catch(() => false)) {
      return true;
    }
    if (await this.improvedBriefPanel().isVisible().catch(() => false)) {
      return true;
    }
    if (
      await this.page
        .getByText(/Small adaptation applied|adaptation applied/i)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return true;
    }

    const current = (await this.captureRefinementText()).trim();
    const base = baselineText.trim();
    if (current.length < 15 || base.length < 15) {
      return false;
    }
    if (normalizeBriefText(current) !== normalizeBriefText(base)) {
      return true;
    }
    return current.length >= base.length + 40;
  }

  private originalBriefPanel(): Locator {
    return this.page
      .getByText(/^Original\b/i)
      .first()
      .locator('xpath=ancestor::*[self::section or self::div][1]');
  }

  private improvedBriefPanel(): Locator {
    return this.page
      .getByText(/^Improved\b/i)
      .first()
      .locator('xpath=ancestor::*[self::section or self::motion.div or self::motion.div or self::div][1]');
  }

  /** Wait until a prior **Generating your new brief** run (e.g. from TC-013) has finished. */
  public async waitForBriefStageIdle(timeoutMs = 5 * 60_000): Promise<void> {
    await test.step('Wait for brief stage to be idle', async () => {
      const generating = this.generatingNewBriefSection();
      if (!(await generating.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return;
      }

      await expect
        .poll(async () => !(await generating.isVisible().catch(() => false)), {
          timeout: timeoutMs,
          intervals: [2000, 3000, 5000],
          message: 'Brief stage stayed in Generating your new brief from a previous run',
        })
        .toBe(true);
    });
  }

  public async clickMyBrief(): Promise<void> {
    await test.step('Click My Brief (1. Brief stage)', async () => {
      if (!(await this.isOnBriefStage())) {
        const tab = this.myBriefStageTab();
        await expect(tab).toBeVisible({ timeout: 20_000 });
        await tab.scrollIntoViewIfNeeded().catch(() => {});
        await tab.click({ force: true });
      }

      await expect(
        this.page
          .getByText(/1\.\s*Brief/i)
          .or(this.page.getByRole('button', { name: /^1$/ }))
          .first(),
      ).toBeVisible({ timeout: 10_000 });
      await expect(this.briefStageAnchor()).toBeVisible({ timeout: 15_000 });
      await expect(this.briefEditor()).toBeVisible({ timeout: 15_000 });
    });
  }

  public async ensureBriefSeedText(seed: string): Promise<void> {
    await test.step('Enter brief text', async () => {
      const expected = seed.trim();
      await expect(this.briefEditor()).toBeVisible({ timeout: 15_000 });
      await this.page.waitForTimeout(BRIEF_ENTRY_SETTLE_MS);

      const field = this.briefEditor();
      const current = (await field.inputValue().catch(() => '')).trim();
      if (normalizeBriefText(current) === normalizeBriefText(expected)) {
        return;
      }

      await field.scrollIntoViewIfNeeded();
      await field.click();
      await field.fill(expected);
      await expect
        .poll(async () => normalizeBriefText(await this.briefEditor().inputValue()), {
          timeout: 8_000,
        })
        .toBe(normalizeBriefText(expected));
    });
  }

  public async captureBriefTextareaValue(): Promise<string> {
    const editor = this.briefEditor();
    if (await editor.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return (await editor.inputValue()).trim();
    }
    return (await this.page.locator('main').innerText().catch(() => '')).trim();
  }

  public async clickImproveMyBrief(): Promise<void> {
    await test.step('Click Improve My Brief', async () => {
      const btn = this.improveMyBriefButton();
      await expect(btn).toBeVisible({ timeout: 15_000 });
      await expect(btn).toBeEnabled({ timeout: 15_000 });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
    });
  }

  /**
   * Click **Improve My Brief**, wait for AI output; on **Failed to improve brief**, click again (up to `maxAttempts`).
   * @returns `comparison` when **Generate Brief** / Original–Improved UI is shown; `inline` when the editor was updated directly.
   */
  public async clickImproveMyBriefAndWaitForRefinedOutput(
    baselineText: string,
    options?: { maxAttempts?: number; timeoutMs?: number },
  ): Promise<'comparison' | 'inline'> {
    const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);
    const timeoutMs = options?.timeoutMs ?? IMPROVE_BRIEF_AI_TIMEOUT_MS;

    return await test.step('Improve My Brief (retry on failure)', async () => {
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        await test.step(`Improve My Brief — attempt ${attempt}/${maxAttempts}`, async () => {
          if (attempt > 1) {
            await this.testInfo.attach('improve-brief-retry', {
              body: `Staging showed "Failed to improve brief" — clicking Improve My Brief again (attempt ${attempt}/${maxAttempts}).`,
              contentType: 'text/plain',
            });
            await this.deliverablePage.dismissBlockingDeliverablePanels();
            await expect(this.improveBriefFailedMessage())
              .not.toBeVisible({ timeout: 15_000 })
              .catch(() => undefined);
            await this.page.waitForTimeout(1_000);
          }

          await this.clickImproveMyBrief();
        });

        try {
          return await this.waitForAiRefinedOutput(baselineText, timeoutMs);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const failedVisible = await this.isImproveBriefFailed();
          const isTransientFailure =
            error instanceof ImproveBriefFailedError ||
            error instanceof ImproveBriefNotStartedError ||
            failedVisible ||
            /failed to improve brief|did not start/i.test(lastError.message);

          if (isTransientFailure && attempt < maxAttempts) {
            await this.testInfo.attach('improve-brief-retry', {
              body: `${lastError.message} — clicking Improve My Brief again (attempt ${attempt + 1}/${maxAttempts}).`,
              contentType: 'text/plain',
            });
            continue;
          }
          throw lastError;
        }
      }

      throw lastError ?? new ImproveBriefFailedError('Improve My Brief failed after retries');
    });
  }

  private async resolveRefinementMode(): Promise<'comparison' | 'inline'> {
    if (await this.generateBriefButton().isVisible().catch(() => false)) {
      return 'comparison';
    }
    return 'inline';
  }

  private async isImproveActivityVisible(): Promise<boolean> {
    if (await this.isAiLoading()) {
      return true;
    }
    return await this.improveMyBriefButton()
      .isDisabled()
      .catch(() => false);
  }

  /**
   * @returns `comparison` when **Generate Brief** / Original–Improved UI is shown; `inline` when the editor was updated directly.
   */
  public async waitForAiRefinedOutput(
    baselineText: string,
    timeoutMs = IMPROVE_BRIEF_AI_TIMEOUT_MS,
  ): Promise<'comparison' | 'inline'> {
    return await test.step('Wait for AI-generated / refined output', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();

      if (await this.isRefinementReady(baselineText)) {
        return await this.resolveRefinementMode();
      }

      let refinementStarted = false;
      try {
        await expect
          .poll(
            async () => {
              await this.deliverablePage.dismissBlockingModalOverlays();
              await this.throwIfImproveBriefFailed();

              if (await this.isRefinementReady(baselineText)) {
                return true;
              }
              return this.isImproveActivityVisible();
            },
            {
              timeout: IMPROVE_BRIEF_START_TIMEOUT_MS,
              intervals: [400, 800, 1500, 2500],
              message: 'AI refinement did not start (no loading state after Improve My Brief)',
            },
          )
          .toBe(true);
        refinementStarted = true;
      } catch {
        if (await this.isRefinementReady(baselineText)) {
          refinementStarted = true;
        } else {
          await this.throwIfImproveBriefFailed();
        }
      }

      if (!refinementStarted) {
        throw new ImproveBriefNotStartedError();
      }

      if (await this.isRefinementReady(baselineText)) {
        await this.throwIfImproveBriefFailed();
        return await this.resolveRefinementMode();
      }

      await expect
        .poll(
          async () => {
            await this.deliverablePage.dismissBlockingModalOverlays();
            await this.throwIfImproveBriefFailed();
            return this.isRefinementReady(baselineText);
          },
          {
            timeout: timeoutMs,
            intervals: [1000, 2000, 3000, 5000, 10_000],
            message: 'AI refinement did not finish within timeout',
          },
        )
        .toBe(true);

      await this.throwIfImproveBriefFailed();

      if (await this.generateBriefButton().isVisible().catch(() => false)) {
        return 'comparison';
      }
      return 'inline';
    });
  }

  private async readPanelText(panel: Locator): Promise<string> {
    if (!(await panel.isVisible().catch(() => false))) {
      return '';
    }
    return (await panel.innerText()).replace(/\s+/g, ' ').trim();
  }

  public async captureBriefComparison(): Promise<BriefComparisonSnapshot> {
    const originalPanel = this.originalBriefPanel();
    const improvedPanel = this.improvedBriefPanel();
    const hasSplit = await originalPanel.isVisible().catch(() => false);

    if (hasSplit && (await improvedPanel.isVisible().catch(() => false))) {
      return {
        original: await this.readPanelText(originalPanel),
        improved: await this.readPanelText(improvedPanel),
      };
    }

    const textarea = await this.captureBriefTextareaValue();
    return { original: textarea, improved: textarea };
  }

  public async assertOriginalAndImprovedIntent(
    beforeImprove: string,
    intent: BriefImprovementIntent,
  ): Promise<BriefComparisonSnapshot> {
    return await test.step('Compare original and improved content (intent)', async () => {
      const comparison = await this.captureBriefComparison();

      const hasImprovedPanel = await this.improvedBriefPanel().isVisible().catch(() => false);
      const originalText =
        (await this.originalBriefPanel().isVisible().catch(() => false)) ?
          comparison.original
        : beforeImprove;
      const improvedText = hasImprovedPanel ?
          comparison.improved
        : await this.captureBriefTextareaValue();

      await this.testInfo.attach('brief-comparison', {
        body: JSON.stringify(
          {
            originalPreview: originalText.slice(0, 500),
            improvedPreview: improvedText.slice(0, 500),
            originalLength: originalText.length,
            improvedLength: improvedText.length,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });

      if (await this.originalBriefPanel().isVisible().catch(() => false)) {
        await expect(this.originalBriefPanel()).toBeVisible();
      }
      if (await this.improvedBriefPanel().isVisible().catch(() => false)) {
        await expect(this.improvedBriefPanel()).toBeVisible();
      }

      assertBriefMatchesIntent(originalText, intent, 'Original brief');
      assertImprovedRelatesToOriginal(originalText, improvedText, intent);

      const normOrig = normalizeBriefText(originalText);
      const normImp = normalizeBriefText(improvedText);
      if (normOrig.length > 0 && normImp.length > 0 && normOrig !== normImp) {
        expect(normImp).not.toBe(normOrig);
      }

      return { original: originalText, improved: improvedText };
    });
  }

  public async clickGenerateBriefIfPresent(
    timeoutMs = GENERATE_BRIEF_APPLY_TIMEOUT_MS,
  ): Promise<boolean> {
    const btn = this.generateBriefButton();
    if (!(await btn.isVisible().catch(() => false))) {
      return false;
    }

    await test.step('Click Generate Brief', async () => {
      await expect(btn).toBeEnabled({ timeout: 15_000 });
      await btn.scrollIntoViewIfNeeded();
      await btn.click();

      await expect
        .poll(
          async () => {
            const adapting = await this.page
              .getByText(/Small adaptation applied|adaptation applied|Applying/i)
              .first()
              .isVisible()
              .catch(() => false);
            const generating = await this.page
              .getByText(/Generating your new brief/i)
              .first()
              .isVisible()
              .catch(() => false);
            return adapting || generating;
          },
          { timeout: 15_000, intervals: [500, 1000] },
        )
        .toBe(true)
        .catch(() => {});

      await expect
        .poll(
          async () => {
            const generating = await this.page
              .getByText(/Generating your new brief/i)
              .first()
              .isVisible()
              .catch(() => false);
            return !generating;
          },
          {
            timeout: timeoutMs,
            intervals: [1000, 2000, 3000],
            message: 'Generate Brief did not finish applying',
          },
        )
        .toBe(true);
    });

    return true;
  }

  public async clickBriefSubmit(): Promise<void> {
    await test.step('Click brief submit (send)', async () => {
      const submit = this.briefSubmitButton();
      await expect(submit).toBeVisible({ timeout: 15_000 });
      await expect(submit).toBeEnabled({ timeout: 15_000 });
      await submit.scrollIntoViewIfNeeded();
      await submit.click();
    });
  }

  /** Wait for **Generating your new brief…** to finish while settings is not yet completed. */
  public async waitForGeneratingNewBriefBeforeSettingsComplete(
    timeoutMs = BRIEF_SUBMIT_GENERATION_TIMEOUT_MS,
  ): Promise<void> {
    await test.step(
      'Wait for Generating your new brief to complete (before settings finished)',
      async () => {
        await expect(this.generatingNewBriefSection()).toBeVisible({ timeout: 90_000 });

        await expect
          .poll(
            async () => {
              const generating = await this.generatingNewBriefSection()
                .isVisible()
                .catch(() => false);
              const briefText = (await this.captureBriefTextareaValue()).trim();
              const briefSubstantiallyUpdated = briefText.length >= 80;

              const adaptationApplied = await this.page
                .getByText(/Small adaptation applied|adaptation applied/i)
                .first()
                .isVisible()
                .catch(() => false);
              const readingDone = await this.page
                .getByText(/Reading brief.*100%|100%.*Reading brief|ProjectMapper.*Done|completed/i)
                .first()
                .isVisible()
                .catch(() => false);
              const briefReady =
                (await this.briefEditor().isVisible().catch(() => false)) && briefText.length >= 40;

              if (!generating) {
                return adaptationApplied || readingDone || briefReady;
              }

              // Staging can keep the banner while the brief body is already updated.
              return briefSubstantiallyUpdated && briefReady;
            },
            {
              timeout: timeoutMs,
              intervals: [1000, 2000, 3000, 5000],
              message:
                'Generating your new brief did not complete before settings finished',
            },
          )
          .toBe(true);

        await this.assertSettingsNotYetCompleted();
      },
    );
  }

  private async assertSettingsNotYetCompleted(): Promise<void> {
    const fullProgressDone = await this.page
      .getByText(/^Progress$/i)
      .first()
      .locator('xpath=ancestor::*[1]')
      .getByText(/generation complete|100%|successfully generated/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(fullProgressDone, 'Full deliverable generation should not be complete yet').toBe(
      false,
    );

    const generateDeliverableDone = await this.page
      .getByRole('button', { name: /^Generate deliverable$/i })
      .isDisabled()
      .catch(() => false);
    if (generateDeliverableDone) {
      const settingsVisible = await this.settingsStageAnchor().isVisible().catch(() => false);
      expect(
        settingsVisible,
        'Settings may be open but deliverable generation must not be finished',
      ).toBeTruthy();
    }
  }

  private settingsGoalsField(): Locator {
    return this.page
      .getByRole('textbox', { name: /Increase user retention/i })
      .or(this.page.getByPlaceholder(/Increase user retention/i))
      .first();
  }

  private async captureRefinedBriefText(): Promise<string> {
    if (await this.settingsGoalsField().isVisible().catch(() => false)) {
      return (await this.settingsGoalsField().inputValue()).trim();
    }
    if (await this.isOnBriefStage()) {
      return await this.captureBriefTextareaValue();
    }
    await this.clickMyBrief();
    return await this.captureBriefTextareaValue();
  }

  public async assertCanContinueWithRefinedBrief(
    intent: BriefImprovementIntent,
    improvedSnapshot: BriefComparisonSnapshot,
  ): Promise<void> {
    await test.step('Verify user can continue using refined brief', async () => {
      const onSettings =
        (await this.settingsStageAnchor().isVisible().catch(() => false)) ||
        (await this.page
          .getByText(/Small adaptation applied/i)
          .first()
          .isVisible()
          .catch(() => false));

      if (onSettings) {
        await expect(this.page.getByText(/2\.\s*Settings/i).first()).toBeVisible({
          timeout: 15_000,
        });
        await expect(this.settingsStageAnchor()).toBeVisible({ timeout: 15_000 });
        await expect(this.settingsGoalsField()).toBeVisible({ timeout: 15_000 });
      } else {
        await this.clickMyBrief();
        await expect(this.improveMyBriefButton()).toBeVisible();
      }

      const current = await this.captureRefinedBriefText();
      expect(current.length, 'Refined brief should be present in editor or settings').toBeGreaterThan(
        intent.minImprovedLength,
      );
      assertBriefMatchesIntent(current, intent, 'Refined brief after submit');

      const normCurrent = normalizeBriefText(current);
      const normImproved = normalizeBriefText(improvedSnapshot.improved);
      if (normImproved.length > 0) {
        const overlap = countMatchedThemes(current, intent.themes);
        expect(overlap, 'Refined brief should still match business intent').toBeGreaterThanOrEqual(
          intent.minThemesMatched,
        );
        const onSettingsGoals =
          onSettings ||
          (await this.settingsGoalsField().isVisible().catch(() => false));
        if (!onSettingsGoals) {
          expect(
            normCurrent === normImproved ||
              normCurrent.includes(normImproved.slice(0, 40)) ||
              normImproved.includes(normCurrent.slice(0, 40)),
            'Refined text should align with improved snapshot',
          ).toBeTruthy();
        }
      }

      await expect(
        this.page
          .getByRole('button', { name: /2\.\s*Settings/i })
          .or(this.page.getByRole('button', { name: /^2$/ }))
          .or(this.page.getByText(/2\.\s*Settings/i))
          .first(),
      ).toBeVisible();
    });
  }
}
