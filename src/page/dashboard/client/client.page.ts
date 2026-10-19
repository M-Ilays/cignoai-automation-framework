import { LocatorDetails } from '@interface/base/locator.interface';
import { Locator, Page, test, TestInfo } from '@playwright/test';
import { PlaywrightActionsFactory } from '@utilities/playwright/playwright-actions.utils';

export interface ClientData {
  name: string;
  website: string;
  industry: string;
  description?: string;
}

export class ClientPage {
  private readonly page: Page;
  private readonly actions: PlaywrightActionsFactory;
  private readonly locators: { [key: string]: LocatorDetails };
  /**
   * New-client sheet — scoped so we never hit Search Clients or other inputs with the same placeholder.
   * Prefer a dialog that contains the name field: Save is sometimes portaled outside the dialog subtree,
   * so `filter({ has: save })` can match nothing while the form fields still live under `[role="dialog"]`.
   */
  private readonly newClientForm: Locator;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.actions = new PlaywrightActionsFactory(page, testInfo);

    const dialogOrModal = page.locator('[role="dialog"], [aria-modal="true"]');
    this.newClientForm = dialogOrModal
      .filter({ has: page.getByPlaceholder(/enter client name/i) })
      .or(dialogOrModal.filter({ has: page.getByTestId('testid-clientCreate-save') }))
      .first();

    this.locators = {
      addClientButton: {
        description: 'Add Client (+) button',
        locator: page
          .getByRole('button', { name: /Add item to SHARED WORK WITH CLIENT/i })
          .or(page.getByRole('button', { name: /Add item to ALL CLIENTS/i }))
          .or(page.locator('text=ALL CLIENTS').locator('..').getByRole('button'))
          .first(),
      },
      nameInput: {
        description: 'Client Name input',
        locator: this.newClientForm
          .getByPlaceholder(/Enter client name/i)
          .or(page.getByPlaceholder('Enter client name...'))
          .first(),
      },
      websiteInput: {
        description: 'Client Website input',
        locator: this.newClientForm
          .getByPlaceholder(/https|example|website|client.*url|enter.*url/i)
          .or(this.newClientForm.getByLabel(/website|client url|url/i))
          .or(this.newClientForm.getByRole('textbox', { name: /website|url/i }))
          .or(this.newClientForm.getByRole('combobox', { name: /website|url/i }))
          .or(
            dialogOrModal
              .filter({ has: page.getByPlaceholder(/enter client name/i) })
              .getByPlaceholder(/https|example|website|url/i),
          )
          .or(page.getByPlaceholder(/https:\/\/|example\.com|website|url/i))
          .first(),
      },
      industryInput: {
        description: 'Industry input',
        locator: this.newClientForm
          .getByPlaceholder(/Type an industry|industry|enter industry/i)
          .or(this.newClientForm.getByLabel(/industry/i))
          .or(this.newClientForm.getByRole('textbox', { name: /industry/i }))
          .or(this.newClientForm.getByRole('combobox', { name: /industry/i }))
          .or(page.getByPlaceholder('Type an industry and press Enter'))
          .or(
            dialogOrModal
              .filter({ has: page.getByPlaceholder(/enter client name/i) })
              .getByPlaceholder(/industry|type an industry/i),
          )
          .first(),
      },
      descriptionInput: {
        description: 'Description input',
        locator: this.newClientForm
          .getByPlaceholder(/additional notes|description/i)
          .or(page.getByPlaceholder('Add any additional notes...'))
          .first(),
      },
      saveButton: {
        description: 'Save button',
        locator: this.newClientForm.getByTestId('testid-clientCreate-save').or(page.getByTestId('testid-clientCreate-save')).first(),
      },
      cancelButton: {
        description: 'Cancel button',
        locator: this.newClientForm.getByRole('button', { name: /^Cancel$/i }).or(page.getByRole('button', { name: 'Cancel' })).first(),
      },
    };
  }

  public async clickAddClient(): Promise<void> {
    await test.step('Click Add Client (+) button', async () => {
      await this.actions.click(this.locators.addClientButton);
    });
  }

  public async touchEmptyClientFields(): Promise<void> {
    await test.step('Click into each field without entering data', async () => {
      await this.locators.nameInput.locator.waitFor({ state: 'visible', timeout: 15000 });
      await this.locators.nameInput.locator.click();
      await this.page.waitForTimeout(200);
      await this.locators.websiteInput.locator.click();
      await this.page.waitForTimeout(200);
      await this.locators.industryInput.locator.click();
      await this.page.waitForTimeout(200);
      await this.locators.descriptionInput.locator.click();
      await this.page.waitForTimeout(200);
    });
  }

  public newClientFormSaveButton(): Locator {
    return this.locators.saveButton.locator;
  }

  public async clickCancelNewClientForm(): Promise<void> {
    await test.step('Click Cancel on new client form', async () => {
      await this.actions.click(this.locators.cancelButton);
    });
  }

  public async selectClientInSidebar(clientName: string): Promise<void> {
    await test.step(`Select client in sidebar: ${clientName}`, async () => {
      const escaped = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');

      const treeItem = this.page.getByRole('treeitem', { name: re });
      const inNav = this.page.locator('nav, aside, [class*="sidebar"]').getByText(re);
      const anywhere = this.page.getByText(re);

      if (
        (await treeItem.count()) === 0 &&
        (await inNav.count()) === 0 &&
        (await anywhere.count()) === 0
      ) {
        throw new Error(`Client "${clientName}" not found in tree, sidebar/nav, or page.`);
      }

      let target;
      if ((await treeItem.count()) > 0) {
        target = treeItem.first();
      } else if ((await inNav.count()) > 0) {
        target = inNav.first();
      } else {
        target = anywhere.first();
      }

      await target.scrollIntoViewIfNeeded();
      await target.waitFor({ state: 'visible', timeout: 25000 });
      await target.click();
      await this.actions.waitForNetworkIdle();
    });
  }

  /** After Save on create-client form: wait until sheet/modal is gone so sidebar is stable. */
  public async waitForNewClientFormClosed(): Promise<void> {
    await test.step('Wait for new-client form to close', async () => {
      await this.locators.saveButton.locator.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
      await this.locators.nameInput.locator.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    });
  }

  /**
   * Left client tree (Search Clients + ALL CLIENTS) is often a plain div, not nav/aside.
   */
  private clientTreeShell(): Locator {
    const bySearchAndHeader = this.page
      .locator('div')
      .filter({ has: this.page.getByRole('textbox', { name: /Search Clients/i }) })
      .filter({ has: this.page.getByText(/ALL CLIENTS|SHARED WORK WITH CLIENT/i) })
      .first();

    return bySearchAndHeader.or(this.page.locator('nav, aside, [class*="sidebar"]').first());
  }

  /**
   * Sidebar / client tree: hover the client row so the row “add project” control appears, then click its plus.
   * Prefer this over opening client detail + Projects panel when the tree exposes add-on-hover.
   */
  public async hoverSidebarClientAndClickAddProject(clientName: string): Promise<void> {
    await test.step(`Sidebar: hover client and click add-project plus: ${clientName}`, async () => {
      const escaped = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      const shell = this.clientTreeShell();

      await shell
        .getByText(re, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .catch(() => {});

      const treeInShell = shell.getByRole('treeitem', { name: re });
      const rowPointer = shell
        .locator('[cursor=pointer], [class*="cursor-pointer"]')
        .filter({ hasText: re });
      const rowByText = shell.locator('div, li, [role="row"]').filter({ hasText: re });
      const globalTree = this.page.getByRole('treeitem', { name: re });

      let row: Locator;
      if ((await treeInShell.count()) > 0) {
        row = treeInShell.first();
      } else if ((await rowPointer.count()) > 0) {
        row = rowPointer.first();
      } else if ((await rowByText.count()) > 0) {
        row = rowByText.first();
      } else if ((await globalTree.count()) > 0) {
        row = globalTree.first();
      } else {
        throw new Error(
          `Client tree row for "${clientName}" not found (treeitem / pointer row under Search Clients shell).`,
        );
      }

      await row.scrollIntoViewIfNeeded();
      await row.waitFor({ state: 'visible', timeout: 25000 });
      await row.hover();

      const rowPlus = row
        .locator('button:has(svg.lucide-plus)')
        .or(row.getByRole('button', { name: /add.*project|new project|create project/i }))
        .first();

      await rowPlus.waitFor({ state: 'visible', timeout: 15000 });
      await rowPlus.click({ force: true });
      await this.actions.waitForNetworkIdle();
    });
  }

  public async openClientForProjectsAfterCreate(clientName: string): Promise<void> {
    await this.waitForNewClientFormClosed();

    await test.step(`Open client detail: ${clientName}`, async () => {
      await this.page.waitForTimeout(500);
      await this.selectClientInSidebar(clientName);
    });

    await test.step('Wait for Projects section on client detail', async () => {
      await this.page.getByText(/Projects\s*\(\d*\)/i).first().waitFor({ state: 'visible', timeout: 20000 });
    });
  }

  /**
   * Full client slice for “new client → client detail with Projects”: save, then open from nav/tree.
   * Flow specs should call this instead of chaining {@link createClient} + {@link openClientForProjectsAfterCreate}.
   */
  public async runCreateClientThenOpenDetailForProjects(client: ClientData): Promise<void> {
    await this.createClient(client);
    await this.openClientForProjectsAfterCreate(client.name);
  }

  public async createClient(data: ClientData): Promise<void> {
    await this.clickAddClient();

    await test.step('Wait for new-client form', async () => {
      await this.locators.saveButton.locator.waitFor({ state: 'visible', timeout: 25_000 });
    });

    await test.step('Fill client Name', async () => {
      await this.actions.sendKeys(this.locators.nameInput, data.name, true);
    });
    await this.page.waitForTimeout(800);

    await test.step('Fill client Website', async () => {
      await this.actions.sendKeys(this.locators.websiteInput, data.website, true);
    });
    await this.page.waitForTimeout(1500);

    await test.step('Fill Industry', async () => {
      await this.actions.sendKeys(this.locators.industryInput, data.industry, true);
      await this.page.keyboard.press('Enter');
    });
    await this.page.waitForTimeout(1500);

    if (data.description) {
      await test.step('Fill Description', async () => {
        await this.actions.sendKeys(this.locators.descriptionInput, data.description!, true);
      });
      await this.page.waitForTimeout(1500);
    }

    await test.step('Click Save button', async () => {
      await this.actions.click(this.locators.saveButton);
      await this.actions.waitForNetworkIdle();
    });
  }

  /**
   * Clicks the row disclosure (chevron) for a client in the left tree — collapses or expands nested projects.
   */
  public async toggleClientTreeBranch(clientName: string): Promise<void> {
    await test.step(`Toggle client tree branch (expand/collapse): ${clientName}`, async () => {
      const escaped = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      const shell = this.clientTreeShell();
      const row = shell.getByRole('treeitem', { name: re }).first();
      await row.waitFor({ state: 'visible', timeout: 25000 });
      await row.scrollIntoViewIfNeeded();

      const disclosure = row
        .locator('button:has(svg.lucide-chevron-right), button:has(svg.lucide-chevron-down), button:has(svg.lucide-chevron-left)')
        .first();

      if ((await disclosure.count()) > 0) {
        await disclosure.click({ force: true });
      } else {
        const svgChevron = row.locator('svg.lucide-chevron-right, svg.lucide-chevron-down').first();
        await svgChevron.click({ force: true });
      }

      await this.page.waitForTimeout(450);
      await this.actions.waitForNetworkIdle();
    });
  }
}
