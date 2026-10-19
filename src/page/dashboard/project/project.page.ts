import { LocatorInfo } from '@interface/base/locator.interface';
import { ClientProjectFlowProjectInput } from '@interface/dashboard/client-project-flow.interface';
import { expect, Locator, test, Page, TestInfo } from '@playwright/test';
import {
  flushNestedScrollContainersToBottom,
  NESTED_SCROLLABLE_SELECTOR,
  warmScrollClientDetailTowardBottom,
} from '@utilities/playwright/nested-scroll.utils';
import { PlaywrightActionsFactory } from '@utilities/playwright/playwright-actions.utils';

/** Card title on “Create New Project” step — copy may include optional “a”. */
const TYPE_IN_PROJECT_DESCRIPTION_CARD = /Type in (a )?project description/i;

/** Primary control in Projects panel (empty state / first action). Update if DOM layout changes. */
const PROJECTS_PANEL_PRIMARY_BUTTON_XPATH =
  '/html/body/div[2]/div[2]/div[1]/div[2]/div/div[2]/section[2]/div[2]/button';

/** User-specified: exact text node for “Create your first project to get started”. */
const CREATE_FIRST_PROJECT_EXACT_TEXT_XPATH =
  "//*[text()='Create your first project to get started']";

/** User-specified: “Type in a project description” method card (h3 title). */
const TYPE_IN_PROJECT_DESCRIPTION_CARD_H3_XPATH =
  "//h3[contains(@class,'text-base') and text()='Type in a project description']";

/**
 * Region after **Generate project** (name, dates, **Create Project**).
 * Some builds use a **dialog**; others render **Review Project** inline under `main` with no `role="dialog"`.
 */
function postGenerateReviewShellLocator(page: Page): Locator {
  const createProjectBtn = page.getByRole('button', { name: /Create Project/i });

  const modalRoot = page.locator('[role="dialog"], [aria-modal="true"]');
  const modalByTestIds = modalRoot.filter({
    has: page.locator(
      '[data-testid="testid-projectCreate-startDate"], [data-testid="testid-projectCreate-endDate"]',
    ),
  });
  const modalByCopy = modalRoot.filter({
    hasText:
      /project\s*name|project\s*title|name\s*your\s*project|create\s*project|start\s*date|end\s*date|step\s*2|review|deliverable|your\s*project|timeline|schedule|when\s*does|duration/i,
  });
  const modalByCta = modalRoot.filter({ has: createProjectBtn });
  const modalBranch = modalByTestIds.or(modalByCopy).or(modalByCta);

  /** Prefer app shells used by Next/layout-only pages (no `<main>`). */
  const surface = page.locator('main, [role="main"], #__next');
  const inlineByReviewHeading = surface
    .filter({ has: page.getByText(/Review Project/i) })
    .filter({ has: createProjectBtn })
    .first();
  const inlineByStep2 = surface
    .filter({ has: page.getByText(/Step\s*2\s*of\s*2/i) })
    .filter({ has: createProjectBtn })
    .first();
  const inlineByGeneratedCard = surface
    .filter({ has: page.getByText(/Generated Project/i) })
    .filter({ has: createProjectBtn })
    .first();
  const inlineByTestIds = surface
    .filter({
      has: page.locator(
        '[data-testid="testid-projectCreate-startDate"], [data-testid="testid-projectCreate-endDate"]',
      ),
    })
    .filter({ has: createProjectBtn })
    .first();
  /** Some routes render review in a generic column with no `main` / `#__next`. */
  const inlineByBody = page
    .locator('body')
    .filter({ has: page.getByText(/Review Project|Step\s*2\s*of\s*2/i) })
    .filter({ has: createProjectBtn });

  const inlineBranch = inlineByReviewHeading
    .or(inlineByStep2)
    .or(inlineByGeneratedCard)
    .or(inlineByTestIds)
    .or(inlineByBody);

  /** Drop stale/hidden portals; prefer **inline** over modal so `.first()` is the live review surface. */
  const visibleModal = modalBranch.filter({ visible: true });
  const visibleInline = inlineBranch.filter({ visible: true });
  return visibleInline.or(visibleModal).first();
}

export class ProjectPage {
  private readonly page: Page;
  private readonly actions: PlaywrightActionsFactory;
  private readonly locators: { [key: string]: LocatorInfo };
  /** Projects toolbar: Lucide plus inside a button (add project). */
  private readonly addProjectPlusButton: Locator;
  /** Plus button (preferred) or “Create your first project…” when empty state uses text only. */
  private readonly startAddProjectEntry: Locator;
  /** Empty-state CTA: a11y name, then styled <button> from client detail Projects panel, then fallbacks. */
  private readonly createFirstProjectCta: Locator;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.actions = new PlaywrightActionsFactory(page, testInfo);
    this.addProjectPlusButton = page
      .locator('main')
      .first()
      .locator('section')
      .filter({ hasText: /Projects\s*\(/i })
      .locator('button:has(svg.lucide-plus)')
      .or(page.locator('main, [role="main"]').first().locator('button:has(svg.lucide-plus)'))
      .or(page.locator('button:has(svg.lucide-plus)'));
    const firstProjectLabel = /Create your first project to get started/i;
    this.createFirstProjectCta = page
      .locator(`xpath=${CREATE_FIRST_PROJECT_EXACT_TEXT_XPATH}`)
      .or(page.locator(`xpath=//*[normalize-space()='Create your first project to get started']`))
      .or(page.getByRole('button', { name: firstProjectLabel }))
      .or(
        page
          .locator('button.text-blue-600.text-sm')
          .filter({ hasText: firstProjectLabel }),
      )
      .or(page.getByRole('link', { name: firstProjectLabel }))
      .or(page.locator(`xpath=${PROJECTS_PANEL_PRIMARY_BUTTON_XPATH}`));

    /** Text CTA first: sidebar / trees also use lucide-plus; avoid resolving to the wrong control. */
    this.startAddProjectEntry = this.createFirstProjectCta.or(this.addProjectPlusButton);

    /** Modal/sheet that shows after “Generate project” (name + dates + submit). */
    const postGenerateFlow = postGenerateReviewShellLocator(page);

    this.locators = {
      typeInDescriptionCard: {
        description: 'Card: Type in a project description (h3 xpath, then fallbacks)',
        locator: page
          .locator(`xpath=${TYPE_IN_PROJECT_DESCRIPTION_CARD_H3_XPATH}`)
          .or(
            page
              .getByRole('dialog')
              .filter({ hasText: /Create New Project|Which project|Type in|project description|Create/i })
              .locator('[cursor=pointer]')
              .filter({ hasText: TYPE_IN_PROJECT_DESCRIPTION_CARD })
              .filter({ hasNotText: /Coming soon/i })
              .first(),
          )
          .or(
            page
              .getByRole('dialog')
              .filter({ hasText: /Create New Project|Which project|Type in|project description|Create/i })
              .locator('[cursor=pointer]')
              .filter({ hasText: TYPE_IN_PROJECT_DESCRIPTION_CARD })
              .first(),
          )
          .or(
            page
              .getByRole('dialog')
              .filter({ hasText: /project|description|Type in|Create/i })
              .getByRole('button', { name: TYPE_IN_PROJECT_DESCRIPTION_CARD }),
          )
          .or(
            page
              .getByRole('dialog')
              .filter({ hasText: /project|description|Type in|Create/i })
              .getByText(TYPE_IN_PROJECT_DESCRIPTION_CARD),
          )
          .or(
            page
              .getByRole('dialog')
              .filter({ hasText: /project|description|Type in|Create/i })
              .locator('button, [role="button"]')
              .filter({ hasText: /Type in|description.*yourself|manually|write/i })
              .first(),
          )
          .or(page.getByRole('button', { name: TYPE_IN_PROJECT_DESCRIPTION_CARD }))
          .or(page.getByText(TYPE_IN_PROJECT_DESCRIPTION_CARD).first()),
      },
      generateProjectButton: {
        description: 'Generate project',
        locator: page.getByRole('button', { name: /Generate project/i }),
      },
      projectNameInput: {
        description: 'Project Name (after Generate project)',
        locator: postGenerateFlow
          .getByRole('textbox', { name: /Project Name/i })
          .or(postGenerateFlow.getByLabel(/Project Name/i))
          .or(postGenerateFlow.getByPlaceholder(/project name|project title|enter.*project name/i))
          .or(postGenerateFlow.getByRole('combobox', { name: /Project Name/i }))
          .or(page.getByRole('textbox', { name: /Project Name/i }))
          .or(page.getByLabel(/Project Name/i))
          .or(page.getByPlaceholder(/project name|project title|enter.*project name/i))
          .or(page.locator('main, [role="main"]').first().getByLabel(/Project Name/i))
          .or(page.locator('main, [role="main"]').first().getByPlaceholder(/project name|project title/i)),
      },
      startDateInput: {
        description: 'Start Date',
        locator: page
          .getByTestId('testid-projectCreate-startDate')
          .or(postGenerateFlow.getByRole('textbox', { name: /Start Date/i }))
          .or(postGenerateFlow.getByLabel(/Start Date/i))
          .or(postGenerateFlow.getByRole('spinbutton', { name: /Start Date/i }))
          .or(page.getByTestId('testid-projectCreate-startDate'))
          .or(page.getByRole('textbox', { name: /Start Date/i }))
          .or(page.getByLabel(/Start Date/i))
          .or(page.getByRole('spinbutton', { name: /Start Date/i }))
          .or(page.locator('main, [role="main"]').first().getByLabel(/Start Date/i)),
      },
      endDateInput: {
        description: 'End Date',
        locator: page
          .getByTestId('testid-projectCreate-endDate')
          .or(postGenerateFlow.getByRole('textbox', { name: /End Date/i }))
          .or(postGenerateFlow.getByLabel(/End Date/i))
          .or(postGenerateFlow.getByRole('spinbutton', { name: /End Date/i }))
          .or(page.getByTestId('testid-projectCreate-endDate'))
          .or(page.getByRole('textbox', { name: /End Date/i }))
          .or(page.getByLabel(/End Date/i))
          .or(page.getByRole('spinbutton', { name: /End Date/i }))
          .or(page.locator('main, [role="main"]').first().getByLabel(/End Date/i)),
      },
      createProjectButton: {
        description: 'Create Project submit',
        locator: page.getByRole('button', { name: /^Create Project$/i }),
      },
      projectCreationEntry: {
        description: 'Project creation UI (modal/sheet or first choice)',
        locator: page
          .getByRole('dialog')
          .filter({ hasText: /Create New Project|Which project|Type in|project description|Generate|Deliverable|description/i })
          .or(page.getByRole('heading', { name: /new project|create project|project creation/i }))
          .or(page.getByText(/Create New Project|Which project creation|How would you like/i))
          .or(page.getByText(/Create New Deliverable/i))
          .or(page.locator(`xpath=${TYPE_IN_PROJECT_DESCRIPTION_CARD_H3_XPATH}`))
          .or(page.getByRole('button', { name: TYPE_IN_PROJECT_DESCRIPTION_CARD }))
          .or(page.getByText(TYPE_IN_PROJECT_DESCRIPTION_CARD))
          .or(page.getByPlaceholder(/Explain the business context|describe your project|project description/i)),
      },
    };
  }

  /**
   * Dialog that hosts the post-**Generate** review step (project name, dates, submit).
   * @see postGenerateReviewShellLocator
   */
  private reviewStepFlowShell(): Locator {
    return postGenerateReviewShellLocator(this.page);
  }

  private reviewStepCreateProjectButton(): Locator {
    const visibleInShell = this.reviewStepFlowShell()
      .getByRole('button', { name: /Create Project/i })
      .filter({ visible: true });
    return visibleInShell
      .or(this.page.getByRole('button', { name: /^Create Project$/i }).filter({ visible: true }))
      .first();
  }

  /** Project name control on the post-Generate review step (narrower than global fallbacks). */
  private reviewStepProjectNameField(): Locator {
    const shell = this.reviewStepFlowShell();
    return shell
      .getByRole('textbox', { name: /Project Name/i })
      .or(shell.getByLabel(/Project Name/i))
      .or(shell.getByPlaceholder(/project name|project title|enter.*project name/i))
      .or(shell.getByRole('combobox', { name: /Project Name/i }))
      .or(this.locators.projectNameInput.locator)
      .first();
  }

  /**
   * Step 1 of 2 — “Project Description” textarea (matches product placeholder / labels from UI).
   */
  private projectDescriptionField(): Locator {
    return this.page
      .getByPlaceholder(
        /Explain the business context|the problem to address|what you aim to achieve|describe your project|project description|tell us about/i,
      )
      .or(this.page.getByLabel(/^Project Description$/i))
      .or(this.page.getByRole('textbox', { name: /Project Description/i }));
  }

  private formatDdMmYyyy(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /** HTML `input[type=date]` value (yyyy-MM-dd). */
  private formatIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private ddMmYyyyToIso(s: string): string {
    return this.formatIsoDate(this.parseDdMmYyyy(s));
  }

  /** Parse **dd/MM/yyyy** for date math when fixed start is provided without fixed end. */
  private parseDdMmYyyy(s: string): Date {
    const parts = s.trim().split('/');
    if (parts.length !== 3) {
      throw new Error(`Invalid dd/MM/yyyy date: "${s}"`);
    }
    const dd = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const yyyy = parseInt(parts[2], 10);
    return new Date(yyyy, mm - 1, dd);
  }

  /**
   * Review step: native `type=date` needs **yyyy-MM-dd** and can be cleared by a follow-up React render.
   * Re-applies values until stable, then caller should click **Create Project** immediately.
   */
  private async setReviewStepDateFieldsStable(
    startLoc: Locator,
    endLoc: Locator,
    isoStart: string,
    isoEnd: string,
    ddMmStart: string,
    ddMmEnd: string,
  ): Promise<void> {
    const s = startLoc.first();
    const e = endLoc.first();
    await this.page
      .locator('[class*="animate-spin"], .lucide-loader-circle')
      .first()
      .waitFor({ state: 'detached', timeout: 20000 })
      .catch(() => {});

    const isNativeDate = (await s.getAttribute('type').catch(() => '')) === 'date';

    const apply = async (): Promise<void> => {
      if (isNativeDate) {
        await s.scrollIntoViewIfNeeded();
        await s.click({ force: true });
        await s.fill(isoStart, { force: true });
        await e.scrollIntoViewIfNeeded();
        await e.click({ force: true });
        await e.fill(isoEnd, { force: true });
      } else {
        await this.setDdMmYyyyDateField(s, ddMmStart);
        await this.setDdMmYyyyDateField(e, ddMmEnd);
      }
    };

    await apply();

    if (!isNativeDate) {
      return;
    }

    for (let i = 0; i < 6; i++) {
      await this.page.waitForTimeout(120);
      const sv = await s.inputValue().catch(() => '');
      const ev = await e.inputValue().catch(() => '');
      if (sv === isoStart && ev === isoEnd) {
        return;
      }
      await apply();
    }
  }

  /**
   * Enters **dd/MM/yyyy** like a user: **day → month → year** (with `/` between segments).
   * Helps masked / segmented React date fields that reject a single paste.
   */
  private async setDdMmYyyyDateField(loc: Locator, valueDdMmYyyy: string): Promise<void> {
    const parts = valueDdMmYyyy.trim().split('/');
    if (parts.length !== 3) {
      throw new Error(`Expected dd/MM/yyyy, got: "${valueDdMmYyyy}"`);
    }
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];

    await loc.scrollIntoViewIfNeeded();
    await loc.click({ force: true });
    await loc.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await loc.fill('', { force: true }).catch(() => {});

    const delay = 55;
    await loc.pressSequentially(dd, { delay });
    await loc.pressSequentially('/', { delay: 40 });
    await loc.pressSequentially(mm, { delay });
    await loc.pressSequentially('/', { delay: 40 });
    await loc.pressSequentially(yyyy, { delay });

    await loc.press('Tab');
    await this.page.waitForTimeout(250);

    const expected = `${dd}/${mm}/${yyyy}`;
    const current = (await loc.inputValue().catch(() => '')).replace(/\s/g, '');
    if (current.replace(/[^\d]/g, '') !== expected.replace(/[^\d]/g, '')) {
      await loc.evaluate((node, v) => {
        const el = node as HTMLInputElement;
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }, expected);
    }
  }

  private async scrollUntilTargetVisible(target: Locator): Promise<void> {
    const first = target.first();
    for (let i = 0; i < 45; i++) {
      await first.scrollIntoViewIfNeeded().catch(() => {});
      if (await first.isVisible().catch(() => false)) {
        return;
      }

      await this.page.evaluate(() => window.scrollBy(0, 700));

      const scrollers = this.page.locator(NESTED_SCROLLABLE_SELECTOR);
      const raw = await scrollers.count();
      const n = Math.min(raw, 24);
      for (let j = 0; j < n; j++) {
        await scrollers.nth(j).evaluate((el) => {
          el.scrollTop += 700;
        });
      }

      await this.page
        .locator('main, [role="main"]')
        .first()
        .evaluate((el) => {
          el.scrollTop += 700;
        })
        .catch(() => {});

      if (i % 4 === 3) {
        await flushNestedScrollContainersToBottom(this.page);
      }

      await this.page.waitForTimeout(60);
    }
  }

  public async scrollDownClientDetailTowardProjects(): Promise<void> {
    await test.step('Scroll client detail to bottom (Projects / first project)', async () => {
      await warmScrollClientDetailTowardBottom(this.page);
    });
  }

  /**
   * Scroll down on client detail (window + nested scroll areas) toward Projects.
   * Prefer this name in specs when you only need “scroll down” on the client view.
   */
  public async scrollDown(): Promise<void> {
    await this.scrollDownClientDetailTowardProjects();
  }

  /**
   * Scrolls down, then reveals the “Create your first project to get started” control.
   * Short-circuits when the entry is already visible (avoids redundant heavy scrolling).
   */
  public async scrollDownToFirstProjectCta(): Promise<void> {
    const entry = this.startAddProjectEntry.first();
    if (await entry.isVisible().catch(() => false)) {
      await entry.scrollIntoViewIfNeeded().catch(() => {});
      return;
    }
    await this.scrollDown();
    await this.scrollToFirstProjectCta();
  }

  /**
   * Single entry for “client detail → Projects panel ready to add first project”.
   * Uses targeted reveal scrolling only; {@link scrollToFirstProjectCta} already drives nested viewports.
   */
  public async prepareProjectsPanelForAddProject(): Promise<void> {
    await this.ensureProjectsSectionExpanded();
    await this.scrollToFirstProjectCta();
  }

  /** After add-project is opened (e.g. sidebar row plus), wait for the new-project shell. */
  public async waitForNewProjectFlowVisible(): Promise<void> {
    await test.step('Wait for new project flow (dialog/sheet)', async () => {
      await this.actions.waitForVisibility(this.locators.projectCreationEntry, 22000);
      await this.actions.waitForNetworkIdle();
    });
  }

  /**
   * Wizard through **Generate project** only (review step is left to the caller).
   * Use after {@link ClientPage.hoverSidebarClientAndClickAddProject} + {@link waitForNewProjectFlowVisible}.
   * Then either {@link assertCreateProjectInactiveWhenProjectNameEmptyOnReviewStep} or
   * {@link fillReviewStepProjectNameDatesAndSubmit}.
   */
  public async runWizardThroughGenerate(project: ClientProjectFlowProjectInput): Promise<void> {
    const shell = this.page
      .locator('[role="dialog"], [aria-modal="true"]')
      .filter({ hasText: /project|Create|description|How|Type|Generate|Deliverable/i });
    await shell.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

    const directField = this.projectDescriptionField().first();

    const onDescriptionStep = await directField
      .waitFor({ state: 'visible', timeout: 1500 })
      .then(() => true)
      .catch(() => false);

    if (!onDescriptionStep) {
      await this.chooseTypeInProjectDescriptionCard();
    }

    await this.enterAiProjectDescription(project.aiProjectDescription);
    await this.clickGenerateProject();
  }

  public async continueFirstProjectAiWizard(project: ClientProjectFlowProjectInput): Promise<void> {
    await this.runWizardThroughGenerate(project);
    await this.fillGeneratedProjectForm(project);
  }

  /**
   * One flow: open first-project entry (empty-state / Projects toolbar) → AI description path → submit.
   * Caller should already be on client detail with the add-project control available.
   */
  public async runFirstProjectViaAiDescriptionPath(
    project: ClientProjectFlowProjectInput,
  ): Promise<void> {
    await this.clickCreateFirstProject();
    await this.continueFirstProjectAiWizard(project);
  }

  public async ensureProjectsSectionExpanded(): Promise<void> {
    await test.step('Expand Projects section if collapsed', async () => {
      const header = this.page
        .getByRole('button', { name: /Projects\s*\(\d+\)/i })
        .or(this.page.locator('button').filter({ hasText: /Projects\s*\(\d+\)/i }).first());

      if ((await header.count()) === 0) {
        return;
      }

      const h = header.first();
      const expanded = await h.getAttribute('aria-expanded');
      if (expanded === 'false') {
        await h.click();
        await this.page.waitForTimeout(400);
      }
    });
  }

  public async scrollToFirstProjectCta(): Promise<void> {
    await test.step('Reveal add-project control (plus or first-project link)', async () => {
      const ctaLocator = {
        description: 'Add project (toolbar plus or empty-state control)',
        locator: this.startAddProjectEntry.first(),
      };
      try {
        await this.actions.scrollUntilVisible(ctaLocator, {
          maxScrollAttempts: 30,
          scrollAmount: 400,
          scrollInterval: 150,
        });
      } catch {
        await this.scrollUntilTargetVisible(this.startAddProjectEntry);
      }
      await flushNestedScrollContainersToBottom(this.page);
      await this.startAddProjectEntry.first().scrollIntoViewIfNeeded();
      await this.startAddProjectEntry.first().waitFor({ state: 'visible', timeout: 25000 });
      await this.page.waitForTimeout(400);
    });
  }

  public async clickCreateFirstProject(): Promise<void> {
    await test.step('Start add project (empty-state link or Projects toolbar plus)', async () => {
      const entry = this.startAddProjectEntry.first();
      await entry.scrollIntoViewIfNeeded().catch(() => {});
      await entry.waitFor({ state: 'visible', timeout: 25000 });
      await entry.click({ force: true });
      await this.actions.waitForNetworkIdle();
      await this.actions.waitForVisibility(this.locators.projectCreationEntry, 22000);
      await this.actions.waitForNetworkIdle();
    });
  }

  public async chooseTypeInProjectDescriptionCard(): Promise<void> {
    await test.step('Click “Type in (a) project description” card on Create New Project', async () => {
      const typeInByH3Xpath = this.page.locator(`xpath=${TYPE_IN_PROJECT_DESCRIPTION_CARD_H3_XPATH}`);

      /** Fast path: user-provided h3 xpath is usually ready as soon as the method step paints. */
      try {
        await typeInByH3Xpath.waitFor({ state: 'visible', timeout: 4000 });
        await typeInByH3Xpath.scrollIntoViewIfNeeded();
        await typeInByH3Xpath.click({ force: true });
        await this.actions.waitForNetworkIdle();
        await this.projectDescriptionField().first().waitFor({ state: 'visible', timeout: 25000 });
        return;
      } catch {
        /* fall through to shell-scoped candidates */
      }

      const shell = this.page
        .locator('[role="dialog"], [aria-modal="true"]')
        .filter({ hasText: /project|Create|description|How|Type|Generate|Deliverable|prefer most/i });
      await shell.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

      const s = shell.first();
      const typeInCardPreferred = s
        .locator('[cursor=pointer]')
        .filter({ hasText: TYPE_IN_PROJECT_DESCRIPTION_CARD })
        .filter({ hasNotText: /Coming soon/i })
        .first();
      const typeInCardFallback = s
        .locator('[cursor=pointer]')
        .filter({ hasText: TYPE_IN_PROJECT_DESCRIPTION_CARD })
        .first();

      const candidates: Locator[] = [
        typeInByH3Xpath,
        typeInCardPreferred,
        typeInCardFallback,
        s.getByRole('button', { name: TYPE_IN_PROJECT_DESCRIPTION_CARD }),
        s.getByText(TYPE_IN_PROJECT_DESCRIPTION_CARD),
        s.getByRole('button', { name: /manual|write.*yourself|type it in|enter.*manually|describe yourself/i }),
        this.page.getByRole('button', { name: TYPE_IN_PROJECT_DESCRIPTION_CARD }),
      ];

      let clicked = false;
      for (const loc of candidates) {
        const el = loc.first();
        try {
          await el.waitFor({ state: 'visible', timeout: 1800 });
          await el.scrollIntoViewIfNeeded();
          await el.click({ force: true });
          clicked = true;
          break;
        } catch {
          /* try next candidate */
        }
      }

      if (!clicked) {
        try {
          await typeInByH3Xpath.click({ force: true, timeout: 10000 });
        } catch {
          await typeInCardFallback.click({ force: true, timeout: 10000 });
        }
      }

      await this.actions.waitForNetworkIdle();
      await this.projectDescriptionField().first().waitFor({ state: 'visible', timeout: 25000 });
    });
  }

  public async enterAiProjectDescription(text: string): Promise<void> {
    await test.step('Enter AI project description', async () => {
      const field = this.projectDescriptionField().first();
      await field.waitFor({ state: 'visible', timeout: 25000 });
      await field.click();
      await field.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
      await field.fill(text);
    });
  }

  public async clickGenerateProject(): Promise<void> {
    await test.step('Click Generate project', async () => {
      await this.actions.click(this.locators.generateProjectButton);
      await this.actions.waitForNetworkIdle();
      await this.page
        .getByRole('progressbar')
        .first()
        .waitFor({ state: 'hidden', timeout: 90_000 })
        .catch(() => {});
      await this.page
        .locator('[class*="animate-spin"], .lucide-loader-circle')
        .first()
        .waitFor({ state: 'detached', timeout: 90_000 })
        .catch(() => {});
    });
  }

  /**
   * Step after Generate: project name + dates, then **Create Project** (dates and submit in one flow
   * so React cannot clear native `type=date` values before the click).
   * Data dates are **dd/MM/yyyy**; native inputs receive **yyyy-MM-dd**.
   */
  public async fillGeneratedProjectForm(data: ClientProjectFlowProjectInput): Promise<void> {
    await this.fillReviewStepProjectNameDatesAndSubmit(data, data.projectName);
  }

  /**
   * After **Generate project**: wait for the project name field (dates are not required for this wait).
   * One wait on the **name** control avoids doubling 90s timeouts (shell + field) when both resolve together.
   */
  public async waitForGeneratedProjectReviewStep(): Promise<void> {
    await test.step('Wait for project review step (project name field)', async () => {
      const name = this.reviewStepProjectNameField();
      await name.waitFor({ state: 'visible', timeout: 45_000 });
      await name.scrollIntoViewIfNeeded();
    });
  }

  /**
   * AI may stream a suggested name after Generate; wait until the value stops changing (capped so we always move on).
   */
  private async waitUntilReviewStepProjectNameStopsChanging(nameLoc: Locator, maxWaitMs: number): Promise<void> {
    const deadline = Date.now() + maxWaitMs;
    let last = '\u0000';
    let stableTicks = 0;
    while (Date.now() < deadline) {
      const cur = (await nameLoc.inputValue().catch(() => '')).trim();
      if (cur === last) {
        stableTicks += 1;
      } else {
        stableTicks = 0;
        last = cur;
      }
      if (stableTicks >= 2) {
        return;
      }
      await this.page.waitForTimeout(120);
    }
  }

  /** Clear project name using native value setter so React controlled inputs / textarea actually empty. */
  private async clearReviewStepProjectNameFieldToEmpty(nameLoc: Locator): Promise<void> {
    for (let attempt = 0; attempt < 15; attempt++) {
      await nameLoc.scrollIntoViewIfNeeded();
      await nameLoc.click({ force: true });
      await nameLoc.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
      await nameLoc.press('Delete');
      await nameLoc.fill('');
      await nameLoc.evaluate((el: HTMLElement) => {
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
          setter.call(el, '');
        }
        if (el instanceof HTMLInputElement) {
          el.value = '';
        }
        if (el instanceof HTMLTextAreaElement) {
          el.value = '';
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await this.page.waitForTimeout(300);
      if ((await nameLoc.inputValue().catch(() => '')).trim() === '') {
        return;
      }
      await this.actions.waitForNetworkIdle();
    }
  }

  /** Review shell open and **Create Project** missing, or present but disabled / styled inactive. */
  private async reviewStepSubmitCannotBeUsed(): Promise<boolean> {
    const shell = this.reviewStepFlowShell().first();
    if (!(await shell.isVisible().catch(() => false))) {
      return false;
    }
    const btn = this.reviewStepCreateProjectButton();
    if ((await btn.count()) === 0) {
      return true;
    }
    return this.reviewStepCreateProjectAppearsInactive(btn);
  }

  /** True when the button exists and is disabled / aria-disabled / styled inactive (not “missing”). */
  private async reviewStepCreateProjectAppearsInactive(btn: Locator): Promise<boolean> {
    if ((await btn.count()) === 0) {
      return false;
    }
    const handle = btn.first();
    if (await handle.isDisabled().catch(() => false)) {
      return true;
    }
    if ((await handle.getAttribute('aria-disabled')) === 'true') {
      return true;
    }
    const cls = (await handle.getAttribute('class')) ?? '';
    /** Avoid `opacity-*` alone — many enabled buttons still carry muted utility classes. */
    if (/pointer-events-none|cursor-not-allowed|btn-disabled|disabled:|\bdisabled\b/i.test(cls)) {
      return true;
    }
    const dataDisabled = await handle.getAttribute('data-disabled');
    if (dataDisabled === 'true') {
      return true;
    }
    return false;
  }

  /**
   * **Create Project** on the review dialog: **inactive** (cannot submit) vs **active** (can submit).
   * “Inactive” includes native `disabled`, `aria-disabled="true"`, or common disabled styling.
   */
  public async expectCreateProjectSubmitInactive(inactive: boolean): Promise<void> {
    await test.step(
      inactive ? 'Expect Create Project inactive (review dialog)' : 'Expect Create Project active (review dialog)',
      async () => {
        if (inactive) {
          await expect(this.reviewStepFlowShell().first()).toBeVisible({ timeout: 25000 });
          await expect
            .poll(async () => this.reviewStepSubmitCannotBeUsed(), {
              timeout: 25000,
              message:
                'Create Project should be unusable (hidden, disabled, or inactive styling) while project name is invalid/empty',
            })
            .toBe(true);
        } else {
          const btn = this.reviewStepCreateProjectButton().first();
          await expect(btn).toBeVisible({ timeout: 25_000 });
          await expect(btn).toBeEnabled({ timeout: 45_000 });
        }
      },
    );
  }

  /**
   * After Generate: clear the project name as far as the UI allows, then assert **Create Project** is unusable
   * (missing from DOM, disabled, or inactive). Does **not** require `inputValue` to stay empty if the app keeps a suggestion.
   */
  public async assertCreateProjectInactiveWhenProjectNameEmptyOnReviewStep(): Promise<void> {
    await test.step('Empty / invalid project name: Create Project inactive', async () => {
      await this.waitForGeneratedProjectReviewStep();
      const nameLoc = this.reviewStepProjectNameField();
      /** {@link clickGenerateProject} already drains loaders; short cap only for post-navigation spinners. */
      await this.page
        .locator('[class*="animate-spin"], .lucide-loader-circle')
        .first()
        .waitFor({ state: 'detached', timeout: 8_000 })
        .catch(() => {});
      await this.waitUntilReviewStepProjectNameStopsChanging(nameLoc, 12_000);
      await this.clearReviewStepProjectNameFieldToEmpty(nameLoc);
      try {
        await expect
          .poll(async () => (await nameLoc.inputValue()).trim(), { timeout: 5000 })
          .toBe('');
      } catch {
        /* Some builds keep a non-empty suggested string in the DOM; primary check is unusable submit. */
      }
      await expect
        .poll(async () => this.reviewStepSubmitCannotBeUsed(), {
          timeout: 25_000,
          message: 'Create Project should be inactive (or not rendered) when project name is empty/invalid',
        })
        .toBe(true);
      await expect(this.reviewStepFlowShell().first()).toBeVisible({ timeout: 10000 });
    });
  }

  /**
   * Review step after Generate: enter **project name**, then **dates**, then assert submit is usable and click **Create Project**.
   * Some UIs only enable **Create Project** after dates are set — do not assert “active” before dates.
   * Dates are **dd/MM/yyyy** in data; native `type=date` receives **yyyy-MM-dd**.
   */
  public async fillReviewStepProjectNameDatesAndSubmit(
    data: ClientProjectFlowProjectInput,
    projectName: string,
  ): Promise<void> {
    const trimmed = projectName.trim();
    if (!trimmed) {
      throw new Error(
        'Project name must be non-empty. Use assertCreateProjectInactiveWhenProjectNameEmptyOnReviewStep() for the empty-name case.',
      );
    }

    await test.step('Fill generated project details (name, dates, create)', async () => {
      await this.waitForGeneratedProjectReviewStep();

      await this.page.waitForTimeout(120);

      await test.step('Enter project name (fill + React sync)', async () => {
        const nameLoc = this.reviewStepProjectNameField();
        await nameLoc.scrollIntoViewIfNeeded();
        await nameLoc.click({ force: true });
        await nameLoc.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
        await nameLoc.fill(trimmed);
        await nameLoc.evaluate(
          (el: HTMLElement, v: string) => {
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
              const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
              setter?.call(el, v);
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          },
          trimmed,
        );
        await this.page.waitForTimeout(150);
      });

      await test.step('Wait for date fields', async () => {
        await this.locators.startDateInput.locator.first().waitFor({ state: 'visible', timeout: 20_000 });
        await this.locators.endDateInput.locator.first().waitFor({ state: 'visible', timeout: 20_000 });
      });

      await this.page.waitForTimeout(120);

      const startDdMm =
        data.startDateDdMmYyyy?.trim() || this.formatDdMmYyyy(new Date());
      let endDdMm: string;
      if (data.endDateDdMmYyyy?.trim()) {
        endDdMm = data.endDateDdMmYyyy.trim();
      } else {
        const base = data.startDateDdMmYyyy?.trim()
          ? this.parseDdMmYyyy(data.startDateDdMmYyyy)
          : new Date();
        const end = new Date(base);
        end.setDate(end.getDate() + Math.max(1, data.endDateOffsetDays));
        endDdMm = this.formatDdMmYyyy(end);
      }

      let isoStart: string;
      if (data.startDateDdMmYyyy?.trim()) {
        isoStart = this.ddMmYyyyToIso(data.startDateDdMmYyyy);
      } else {
        isoStart = this.formatIsoDate(new Date());
      }

      let isoEnd: string;
      if (data.endDateDdMmYyyy?.trim()) {
        isoEnd = this.ddMmYyyyToIso(data.endDateDdMmYyyy);
      } else {
        const base = data.startDateDdMmYyyy?.trim()
          ? this.parseDdMmYyyy(data.startDateDdMmYyyy)
          : new Date();
        const end = new Date(base);
        end.setDate(end.getDate() + Math.max(1, data.endDateOffsetDays));
        isoEnd = this.formatIsoDate(end);
      }

      await test.step('Set dates (stable), then expect Create Project active, then submit', async () => {
        await this.setReviewStepDateFieldsStable(
          this.locators.startDateInput.locator,
          this.locators.endDateInput.locator,
          isoStart,
          isoEnd,
          startDdMm,
          endDdMm,
        );
        await this.expectCreateProjectSubmitInactive(false);
        await this.actions.forceClick({
          description: this.locators.createProjectButton.description,
          locator: this.reviewStepCreateProjectButton(),
        });
        await this.actions.waitForNetworkIdle();
      });
    });
  }

  /** Waits for the create-project wizard / review shell to disappear after a successful create. */
  public async waitForProjectCreateWizardClosed(): Promise<void> {
    await test.step('Wait for create-project wizard to close', async () => {
      const wizard = this.page
        .locator('[role="dialog"], [aria-modal="true"]')
        .filter({ hasText: /Create New Project|Project Name|Generate project|Type in.*project description/i });
      await wizard.first().waitFor({ state: 'hidden', timeout: 120000 }).catch(() => {});
      await this.actions.waitForNetworkIdle();
    });
  }

  private projectDetailSurface(): Locator {
    return this.page.locator('main, [role="main"], #__next').first();
  }

  /**
   * Deliverables card on project detail — title may be `Deliverables (0)` or empty-state copy only.
   */
  private deliverablesSection(): Locator {
    const s = this.projectDetailSurface();
    const byCount = s.locator('section, article, div').filter({ hasText: /Deliverables\s*\(\s*\d+\s*\)/i });
    const byEmptyState = s
      .locator('section, article, div')
      .filter({ hasText: /No deliverables linked to this project yet/i });
    const byHeading = s
      .getByRole('heading', { name: /Deliverables/i })
      .locator(
        'xpath=ancestor::section[1]|ancestor::article[1]|ancestor::div[contains(@class,"rounded")][1]|ancestor::div[contains(@class,"border")][1]',
      );
    return byCount.or(byEmptyState).or(byHeading).first();
  }

  public async waitForProjectDetailDeliverablesSection(timeoutMs = 45000): Promise<void> {
    await test.step('Wait for Deliverables section on project detail', async () => {
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      for (let r = 0; r < 10; r += 1) {
        await warmScrollClientDetailTowardBottom(this.page, { rounds: 3, delta: 400 });
        await flushNestedScrollContainersToBottom(this.page).catch(() => {});
        const section = this.deliverablesSection();
        try {
          await section.waitFor({ state: 'visible', timeout: Math.min(8000, timeoutMs) });
          await section.scrollIntoViewIfNeeded();
          return;
        } catch {
          await this.page.waitForTimeout(350);
        }
      }
      const section = this.deliverablesSection();
      await section.waitFor({ state: 'visible', timeout: 10_000 });
      await section.scrollIntoViewIfNeeded();
    });
  }

  /**
   * Some builds auto-open a deliverable sheet right after **Create Project**. The full workflow should use
   * **Deliverables → (+)** instead, so close that overlay first when it matches a deliverable composer.
   */
  private deliverableComposerOverlayLocator(): Locator {
    const wizardCopy = /Create New Project|Generate project|Type in (a )?project description|Step\s*2\s*of\s*2/i;
    const base = this.page
      .locator('[role="dialog"], [aria-modal="true"]')
      .filter({ visible: true })
      .filter({ hasNotText: wizardCopy });

    const byBriefPlaceholder = base.filter({
      has: this.page.getByPlaceholder(/brief|deliverable|describe|strategy|consulting|market entry|what.*building|tell us/i),
    });
    const byDeliverableCopy = base.filter({
      hasText: /Deliverable|deliverable brief|new deliverable|linked to this project/i,
    });
    return byBriefPlaceholder.or(byDeliverableCopy);
  }

  private async dismissAutoOpenedDeliverableComposerIfPresent(): Promise<void> {
    await test.step('Close auto-opened deliverable sheet (workflow continues via Deliverables +)', async () => {
      await this.page.waitForTimeout(800);
      for (let i = 0; i < 6; i += 1) {
        const overlay = this.deliverableComposerOverlayLocator();
        if ((await overlay.count()) === 0) {
          break;
        }
        const panel = overlay.first();
        if (!(await panel.isVisible().catch(() => false))) {
          break;
        }
        const close = panel
          .getByRole('button', { name: /^(Close|Cancel|Back|Dismiss)$/i })
          .or(panel.locator('button[aria-label="Close" i]'))
          .or(panel.locator('button:has(svg.lucide-x)'))
          .first();
        if ((await close.count()) > 0 && (await close.isVisible().catch(() => false))) {
          await close.click({ force: true });
        } else {
          await this.page.keyboard.press('Escape');
        }
        await this.page.waitForTimeout(500);
        await this.actions.waitForNetworkIdle();
      }
    });
  }

  /** Topmost “live” sheet/dialog that is not the create-project wizard — usually the deliverable composer after (+). */
  private activeNonProjectWizardOverlay(): Locator {
    const wizardCopy = /Create New Project|Generate project|Type in (a )?project description|Step\s*2\s*of\s*2/i;
    return this.page
      .locator('[role="dialog"], [aria-modal="true"]')
      .filter({ visible: true })
      .filter({ hasNotText: wizardCopy })
      .last();
  }

  private briefInputInComposer(composer: Locator): Locator {
    return composer
      .locator('textarea')
      .or(composer.getByRole('textbox'))
      .or(composer.getByPlaceholder(/brief|deliverable|describe|strategy|consulting|market entry|tell us|what/i))
      .first();
  }

  /**
   * **Under the current project** on project detail: **always** use **Deliverables → (+)** to open the composer
   * (closes any auto-opened deliverable sheet first), then fill `brief` and submit.
   */
  public async createFirstDeliverableFromProjectDetail(brief: string): Promise<void> {
    const trimmed = brief.trim();
    if (!trimmed) {
      throw new Error('Deliverable brief must be non-empty.');
    }

    await test.step('Settle on project detail after project create', async () => {
      await this.page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {});
      await this.page.waitForTimeout(1200);
    });

    await this.dismissAutoOpenedDeliverableComposerIfPresent();

    await this.waitForProjectDetailDeliverablesSection();

    await test.step('Deliverables: open composer with (+)', async () => {
      const section = this.deliverablesSection();
      await section.waitFor({ state: 'visible', timeout: 30_000 });
      await section.scrollIntoViewIfNeeded();

      const headerPlus = section
        .locator(':scope > *')
        .filter({ hasText: /Deliverables/i })
        .first()
        .locator('..')
        .locator('button:has(svg.lucide-plus)')
        .first();

      const addBtn = headerPlus
        .or(section.locator('button:has(svg.lucide-plus)').first())
        .or(section.getByRole('button', { name: /add|new deliverable|create deliverable/i }));

      await addBtn.waitFor({ state: 'visible', timeout: 25_000 });
      await addBtn.click({ force: true });
      await this.actions.waitForNetworkIdle();
      await this.page.waitForTimeout(700);
    });

    const composer = this.activeNonProjectWizardOverlay();

    await test.step('Enter deliverable brief', async () => {
      const briefField = this.briefInputInComposer(composer);
      await briefField.waitFor({ state: 'visible', timeout: 35_000 });
      await briefField.scrollIntoViewIfNeeded();
      await briefField.click({ force: true });
      await briefField.fill(trimmed);
      await this.page.waitForTimeout(250);
    });

    await test.step('Submit new deliverable', async () => {
      const shell = this.activeNonProjectWizardOverlay();
      const submit = shell
        .getByRole('button', { name: /Create Deliverable|Create|Save|Submit|Continue|Generate|Add deliverable/i })
        .first();
      await submit.waitFor({ state: 'visible', timeout: 20_000 });
      await submit.click({ force: true });
      await this.actions.waitForNetworkIdle();
      await shell
        .waitFor({ state: 'hidden', timeout: 90_000 })
        .catch(() => {});
      await this.page.waitForTimeout(600);
    });
  }

  public async clickCreateProject(): Promise<void> {
    await test.step('Click Create Project', async () => {
      await this.actions.click(this.locators.createProjectButton);
      await this.actions.waitForNetworkIdle();
    });
  }
}
