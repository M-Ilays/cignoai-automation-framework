import { LocatorDetails } from '../../../interface/base/locator.interface';
import { expect, Locator, test, Page, TestInfo } from '@playwright/test';
import { PlaywrightActionsFactory } from '../../../utilities/playwright/playwright-actions.utils';
import { ClientSearchScenario } from '../../../interface/dashboard/client-search.interface';

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ClientSearchPage {
  private readonly page: Page;
  private readonly actions: PlaywrightActionsFactory;
  private readonly locators: { [key: string]: LocatorDetails };

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.actions = new PlaywrightActionsFactory(page, testInfo);

    this.locators = {
      searchClientsInput: {
        description: 'Search Clients field',
        locator: page.getByPlaceholder(/search clients/i),
      },
    };
  }

  public searchClientsInput(): Locator {
    return this.locators.searchClientsInput.locator;
  }

  public sidebarExactClientMatch(label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.locator('aside').getByText(new RegExp(`^${escaped}$`, 'i'));
  }

  /** Main editor shows the active deliverable (title heading or breadcrumb — not sidebar tree). */
  public async waitForDeliverableOpenInMainView(
    deliverableName: string,
    timeoutMs = 20_000,
  ): Promise<void> {
    const label = deliverableName.trim();
    const re = new RegExp(`^${escapeForRegex(label)}$`, 'i');

    await test.step(`Wait for "${label}" in main view`, async () => {
      await expect(
        this.page
          .getByRole('heading', { name: re, level: 2 })
          .or(this.page.getByRole('button', { name: re }))
          .first(),
      ).toBeVisible({ timeout: timeoutMs });
    });
  }

  public async searchClients(term: string): Promise<void> {
    await test.step('Enter text in Search Clients', async () => {
      const input = this.locators.searchClientsInput.locator;
      await input.click();
      await input.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
      await input.fill(term);
      await this.page.waitForTimeout(350);
    });
  }

  public async clearClientSearch(): Promise<void> {
    await test.step('Clear Search Clients field', async () => {
      const input = this.locators.searchClientsInput.locator;
      await input.click();
      await input.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
      await input.fill('');
      await this.page.waitForTimeout(400);
    });
  }

  /** Same shell heuristic as {@link ClientPage#clientTreeShell}: Search Clients panel first, then nav/aside. */
  private clientTreeAsideOrShell(): Locator {
    const bySearchAndHeader = this.page
      .locator('div')
      .filter({ has: this.page.getByRole('textbox', { name: /Search Clients/i }) })
      .filter({ has: this.page.getByText(/ALL CLIENTS|SHARED WORK WITH CLIENT/i) })
      .first();

    return bySearchAndHeader.or(this.page.locator('nav, aside, [class*="sidebar"]').first());
  }

  /**
   * Client row in the tree (single handle — avoids strict-mode violations from `treeitem` + broad `div` matches).
   * With the **full** client list, the first `treeitem` matching by name can be a hidden structural node; prefer a
   * **visible** pointer row whose text includes the label, then visible `treeitem`s.
   */
  private async clientRowHandleInShell(shell: Locator, label: string): Promise<Locator> {
    const re = new RegExp(escapeForRegex(label), 'i');

    const firstVisible = async (loc: Locator): Promise<Locator | null> => {
      const n = await loc.count();
      for (let i = 0; i < n; i += 1) {
        const row = loc.nth(i);
        if (await row.isVisible().catch(() => false)) {
          return row;
        }
      }
      return null;
    };

    const rowTight = shell.locator('[class*="cursor-pointer"][class*="h-7"]').filter({ hasText: re });
    let visible = await firstVisible(rowTight);
    if (visible) {
      return visible;
    }

    const rowPointer = shell
      .locator('[cursor=pointer], [class*="cursor-pointer"]')
      .filter({ hasText: re });
    visible = await firstVisible(rowPointer);
    if (visible) {
      return visible;
    }

    const treeInShell = shell.getByRole('treeitem', { name: re });
    visible = await firstVisible(treeInShell);
    if (visible) {
      return visible;
    }

    const rowByText = shell.locator('li, [role="row"]').filter({ hasText: re });
    visible = await firstVisible(rowByText);
    if (visible) {
      return visible;
    }

    const globalTree = this.page.getByRole('treeitem', { name: re });
    visible = await firstVisible(globalTree);
    if (visible) {
      return visible;
    }

    const exact = await this.clientRowWithExactLabel(shell, label);
    if (exact) {
      return exact;
    }

    throw new Error(
      `No visible sidebar row found for client matching "${label}". Clear search or widen the filter.`,
    );
  }

  /**
   * Expands the client branch so nested projects are visible (chevron **>** / disclosure).
   * Does not rely only on `aria-expanded` — many rows use a chevron button without that attribute.
   */
  private async ensureClientBranchExpandedForRow(row: Locator, settleMs = 450): Promise<void> {
    if ((await row.count()) === 0) {
      return;
    }
    await row.scrollIntoViewIfNeeded();

    const tryExpandInScope = async (scope: Locator): Promise<boolean> => {
      const btn = scope
        .locator('button:has(svg.lucide-chevron-right)')
        .or(scope.locator('[role="button"]:has(svg.lucide-chevron-right)'))
        .first();
      if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
        await btn.click({ force: true });
        await this.page.waitForTimeout(settleMs);
        return true;
      }
      const svg = scope.locator('svg.lucide-chevron-right').first();
      if ((await svg.count()) > 0 && (await svg.isVisible().catch(() => false))) {
        await svg.click({ force: true });
        await this.page.waitForTimeout(settleMs);
        return true;
      }
      return false;
    };

    let scope: Locator = row;
    for (let depth = 0; depth < 5; depth += 1) {
      if (await tryExpandInScope(scope)) {
        return;
      }
      if (depth === 4) {
        break;
      }
      scope = scope.locator('..');
    }

    const expanded = await row.getAttribute('aria-expanded');
    if (expanded === 'false') {
      const disclosure = row.locator('button:has(svg.lucide-chevron-right)').first();
      if ((await disclosure.count()) > 0) {
        await disclosure.click({ force: true });
        await this.page.waitForTimeout(settleMs);
      }
    }
  }

  /**
   * Resolves the **project** node that must be a descendant of the **client** tree row (hierarchy),
   * trying nested `treeitem`, `group` wrappers, or nested `li` rows.
   */
  private projectNodeUnderClientRow(clientRow: Locator, projectName: string): Locator {
    const projectRe = new RegExp(escapeForRegex(projectName), 'i');
    const strictName = new RegExp(`^${escapeForRegex(projectName)}$`, 'i');

    const nestedTreeitem = clientRow.getByRole('treeitem', { name: projectRe });
    const nestedStrict = clientRow.getByRole('treeitem', { name: strictName });
    const inGroup = clientRow.locator('[role="group"]').getByRole('treeitem', { name: projectRe });
    const nestedLi = clientRow.locator('li').filter({ hasText: projectRe });
    const nestedRow = clientRow.locator('[role="row"]').filter({ hasText: projectRe });

    return nestedStrict.or(nestedTreeitem).or(inGroup).or(nestedLi).or(nestedRow);
  }

  private deliverableNodeUnderProjectRow(projectRow: Locator, deliverableName: string): Locator {
    const deliverableRe = new RegExp(`^${escapeForRegex(deliverableName)}$`, 'i');
    const deliverableLoose = new RegExp(escapeForRegex(deliverableName), 'i');

    return projectRow
      .getByRole('treeitem', { name: deliverableRe })
      .or(projectRow.locator('[role="group"]').getByRole('treeitem', { name: deliverableRe }))
      .or(projectRow.locator('li').filter({ hasText: deliverableRe }))
      .or(projectRow.locator('[class*="cursor-pointer"]').filter({ hasText: deliverableLoose }));
  }

  private async clientRowWithExactLabel(shell: Locator, label: string): Promise<Locator | null> {
    const strictRe = new RegExp(`^${escapeForRegex(label)}$`, 'i');
    const looseRe = new RegExp(escapeForRegex(label), 'i');
    const rows = shell
      .locator('[class*="cursor-pointer"][class*="h-7"]')
      .filter({ hasText: looseRe })
      .or(shell.getByRole('treeitem', { name: looseRe }));

    const n = await rows.count();
    for (let i = 0; i < n; i += 1) {
      const row = rows.nth(i);
      if (!(await row.isVisible().catch(() => false))) {
        continue;
      }
      const text = (await row.innerText()).replace(/\s+/g, ' ').trim();
      const primary = text.split('\n')[0]?.trim() ?? text;
      if (strictRe.test(primary) || strictRe.test(text)) {
        return row;
      }
    }
    return null;
  }

  private async firstVisibleExactTextMatch(
    locator: Locator,
    strictRe: RegExp,
  ): Promise<Locator | null> {
    const n = await locator.count();
    for (let i = 0; i < n; i += 1) {
      const row = locator.nth(i);
      if (!(await row.isVisible().catch(() => false))) {
        continue;
      }
      const text = (await row.innerText()).replace(/\s+/g, ' ').trim();
      const primary = text.split('\n')[0]?.trim() ?? text;
      if (strictRe.test(primary) || strictRe.test(text)) {
        return row;
      }
    }
    return null;
  }

  private async findDeliverableRowInTree(
    shell: Locator,
    label: string,
    options?: { clientLabel?: string; projectLabel?: string },
  ): Promise<Locator | null> {
    const deliverableRe = new RegExp(`^${escapeForRegex(label)}$`, 'i');
    const deliverableLoose = new RegExp(escapeForRegex(label), 'i');
    const projectRe = options?.projectLabel?.trim()
      ? new RegExp(`^${escapeForRegex(options.projectLabel.trim())}$`, 'i')
      : null;

    if (options?.clientLabel?.trim() && options?.projectLabel?.trim()) {
      const clientLabel = options.clientLabel.trim();
      let clientRow: Locator | null = null;
      try {
        clientRow =
          (await this.clientRowWithExactLabel(shell, clientLabel)) ??
          (await this.clientRowHandleInShell(shell, clientLabel));
      } catch {
        // Filtered search may hide the parent client — fall through to deliverable-first match.
      }

      if (clientRow && (await clientRow.isVisible().catch(() => false))) {
        await clientRow.scrollIntoViewIfNeeded();
        await this.ensureClientBranchExpandedForRow(clientRow, 250);

        const projectCandidates = this.projectNodeUnderClientRow(clientRow, options.projectLabel.trim());
        const projectRow = projectRe
          ? await this.firstVisibleExactTextMatch(projectCandidates, projectRe)
          : (await projectCandidates.count()) > 0
            ? projectCandidates.first()
            : null;

        if (projectRow && (await projectRow.isVisible().catch(() => false))) {
          await projectRow.scrollIntoViewIfNeeded();
          await this.ensureClientBranchExpandedForRow(projectRow, 250);

          const underProject = this.deliverableNodeUnderProjectRow(projectRow, label);
          const scoped = await this.firstVisibleExactTextMatch(underProject, deliverableRe);
          if (scoped) {
            return scoped;
          }
        }
      }
    }

    const candidates = shell
      .getByRole('treeitem', { name: deliverableRe })
      .or(shell.locator('[class*="cursor-pointer"]').filter({ hasText: deliverableLoose }))
      .or(shell.getByText(deliverableRe));

    return this.firstVisibleExactTextMatch(candidates, deliverableRe);
  }

  /**
   * Types the **per-run unique fragment** into Search Clients (the same suffix embedded in
   * `clientData.name`, e.g. from `faker.string.alphanumeric(10)`), then asserts `projectName` under the
   * matching client row in the tree (the row label contains that fragment).
   */
  public async searchByClientUniqueSuffixThenExpectProjectNestedUnderClient(
    uniqueClientSuffix: string,
    projectName: string,
  ): Promise<void> {
    await test.step(`Search by client suffix "${uniqueClientSuffix}" then verify project "${projectName}"`, async () => {
      await this.searchClients(uniqueClientSuffix);
      await this.expectProjectNestedUnderClientInTree(uniqueClientSuffix, projectName);
    });
  }

  /**
   * Types **project name** into Search Clients, then asserts `projectName` is nested under the client row
   * whose label matches `clientFullName` (the created client’s full name).
   */
  public async searchByProjectNameThenExpectProjectNestedUnderClient(
    projectName: string,
    clientFullName: string,
  ): Promise<void> {
    await test.step(`Search by project name "${projectName}" then verify under client "${clientFullName}"`, async () => {
      await this.searchClients(projectName);
      await this.expectProjectNestedUnderClientInTree(clientFullName, projectName);
    });
  }

  /**
   * Asserts **DOM / a11y hierarchy**: `projectName` appears under the client row whose label matches
   * `clientRowMatch` (full name or a unique **substring** such as the per-run suffix).
   */
  public async expectProjectNestedUnderClientInTree(clientRowMatch: string, projectName: string): Promise<void> {
    await test.step(`Hierarchy: project "${projectName}" under client matching "${clientRowMatch}" in sidebar tree`, async () => {
      const shell = this.clientTreeAsideOrShell();
      let clientRow: Locator | null = null;
      await expect
        .poll(
          async () => {
            try {
              const row = await this.clientRowHandleInShell(shell, clientRowMatch);
              if (await row.isVisible().catch(() => false)) {
                clientRow = row;
                return true;
              }
            } catch {
              // Retry while tree hydrates after search.
            }
            return false;
          },
          {
            timeout: 45_000,
            intervals: [500, 1000, 2000, 3000],
            message: `Visible client row matching "${clientRowMatch}" should appear in sidebar`,
          },
        )
        .toBe(true);

      if (!clientRow) {
        throw new Error(`Client row matching "${clientRowMatch}" was not resolved in sidebar tree`);
      }

      await clientRow.scrollIntoViewIfNeeded();
      await expect(clientRow).toBeVisible({ timeout: 10_000 });
      await test.step('Expand client row (chevron) to show nested projects', async () => {
        await this.ensureClientBranchExpandedForRow(clientRow);
        await this.ensureClientBranchExpandedForRow(clientRow);
      });

      const projectRe = new RegExp(escapeForRegex(projectName), 'i');
      const projectPrefix = projectName.split(/\s+/).filter(Boolean)[0] ?? projectName;
      const projectLooseRe = new RegExp(
        `${escapeForRegex(projectPrefix)}|${escapeForRegex(projectName)}`,
        'i',
      );
      const branchScope = clientRow.locator('xpath=ancestor-or-self::*[@role="treeitem"][1]').or(clientRow);
      const projectInShell = shell
        .getByRole('treeitem', { name: projectLooseRe })
        .or(shell.locator('[class*="cursor-pointer"][class*="h-7"]').filter({ hasText: projectLooseRe }));
      const projectUnder = this.projectNodeUnderClientRow(branchScope, projectName)
        .or(this.projectNodeUnderClientRow(clientRow, projectName))
        .or(projectInShell);

      await expect
        .poll(
          async () => {
            await this.ensureClientBranchExpandedForRow(clientRow);
            const strict = projectUnder.first();
            if (await strict.isVisible().catch(() => false)) {
              return true;
            }
            const loose = shell
              .getByText(projectLooseRe)
              .or(shell.getByRole('treeitem', { name: projectLooseRe }))
              .or(this.page.getByText(projectName, { exact: false }));
            return await loose.first().isVisible().catch(() => false);
          },
          {
            timeout: 60_000,
            intervals: [1000, 2000, 3000, 5000],
            message: `Project "${projectName}" should appear under client "${clientRowMatch}" in sidebar`,
          },
        )
        .toBe(true);
    });
  }

  /**
   * Visible **client** row in the sidebar tree (top-level client, not a project).
   */
  public async resolveClientRowInTree(clientName: string): Promise<Locator> {
    const shell = this.clientTreeAsideOrShell();
    const strictRe = new RegExp(`^${escapeForRegex(clientName)}$`, 'i');
    const pointerRow = shell.locator('[class*="cursor-pointer"]').filter({ hasText: strictRe });
    const treeRow = shell.getByRole('treeitem', { name: strictRe });

    let resolved: Locator | null = null;
    await expect
      .poll(
        async () => {
          const direct = treeRow.or(pointerRow);
          const n = await direct.count();
          for (let i = 0; i < n; i += 1) {
            const row = direct.nth(i);
            if (!(await row.isVisible().catch(() => false))) {
              continue;
            }
            const text = ((await row.textContent()) ?? '').trim();
            if (strictRe.test(text)) {
              resolved = row;
              return true;
            }
          }
          return false;
        },
        {
          timeout: 45_000,
          intervals: [500, 1000, 2000],
          message: `Visible client row "${clientName}" in sidebar`,
        },
      )
      .toBe(true);

    if (!resolved) {
      throw new Error(`Client row "${clientName}" was not resolved in sidebar tree`);
    }
    return resolved;
  }

  public async expectClientVisibleInTree(clientName: string): Promise<void> {
    await test.step(`Hierarchy: client "${clientName}" visible in sidebar tree`, async () => {
      await this.resolveClientRowInTree(clientName);
    });
  }

  public async expectClientAbsentInTree(clientName: string): Promise<void> {
    await test.step(`Hierarchy: client "${clientName}" absent from sidebar tree`, async () => {
      const shell = this.clientTreeAsideOrShell();
      const strictRe = new RegExp(`^${escapeForRegex(clientName)}$`, 'i');
      const visibleMatches = shell
        .getByRole('treeitem', { name: strictRe })
        .or(shell.locator('[class*="cursor-pointer"]').filter({ hasText: strictRe }))
        .or(shell.getByText(strictRe));

      await expect
        .poll(
          async () => {
            const n = await visibleMatches.count();
            for (let i = 0; i < n; i += 1) {
              const node = visibleMatches.nth(i);
              if (!(await node.isVisible().catch(() => false))) {
                continue;
              }
              const text = ((await node.textContent()) ?? '').trim();
              if (strictRe.test(text)) {
                return false;
              }
            }
            return true;
          },
          {
            timeout: 30_000,
            intervals: [500, 1000, 2000],
            message: `Client "${clientName}" should be removed from sidebar tree`,
          },
        )
        .toBe(true);
    });
  }

  /**
   * Visible sidebar row for `projectName` nested under the client matching `clientRowMatch`.
   * Expands the client branch first (same resolution as hierarchy assertions).
   */
  public async resolveProjectRowUnderClient(clientRowMatch: string, projectName: string): Promise<Locator> {
    const shell = this.clientTreeAsideOrShell();
    const strictRe = new RegExp(`^${escapeForRegex(projectName)}$`, 'i');
    const pointerRow = shell.locator('[class*="cursor-pointer"]').filter({ hasText: strictRe });
    const treeRow = shell.getByRole('treeitem', { name: strictRe });

    let resolved: Locator | null = null;
    await expect
      .poll(
        async () => {
          const direct = treeRow.or(pointerRow);
          const n = await direct.count();
          for (let i = 0; i < n; i += 1) {
            const row = direct.nth(i);
            if (!(await row.isVisible().catch(() => false))) {
              continue;
            }
            const text = ((await row.textContent()) ?? '').trim();
            if (strictRe.test(text)) {
              resolved = row;
              return true;
            }
          }

          try {
            const clientRow = await this.clientRowHandleInShell(shell, clientRowMatch);
            await this.ensureClientBranchExpandedForRow(clientRow);
            const branchScope = clientRow.locator('xpath=ancestor-or-self::*[@role="treeitem"][1]').or(clientRow);
            const projectUnder = this.projectNodeUnderClientRow(branchScope, projectName).or(
              this.projectNodeUnderClientRow(clientRow, projectName),
            );
            const scoped = projectUnder.or(pointerRow);
            const m = await scoped.count();
            for (let j = 0; j < m; j += 1) {
              const row = scoped.nth(j);
              if (await row.isVisible().catch(() => false)) {
                resolved = row;
                return true;
              }
            }
          } catch {
            // Search may hide the client row — direct project row above is enough.
          }
          return false;
        },
        {
          timeout: 45_000,
          intervals: [500, 1000, 2000],
          message: `Visible project row "${projectName}" (client hint "${clientRowMatch}")`,
        },
      )
      .toBe(true);

    if (!resolved) {
      throw new Error(`Project row "${projectName}" was not resolved (client hint "${clientRowMatch}")`);
    }
    return resolved;
  }

  /** After delete: project name must not appear in the sidebar tree (search may hide the parent client). */
  public async expectProjectAbsentUnderClientInTree(clientRowMatch: string, projectName: string): Promise<void> {
    await test.step(`Hierarchy: project "${projectName}" absent (client hint "${clientRowMatch}")`, async () => {
      const shell = this.clientTreeAsideOrShell();
      const strictRe = new RegExp(`^${escapeForRegex(projectName)}$`, 'i');
      const visibleMatches = shell
        .getByRole('treeitem', { name: strictRe })
        .or(shell.locator('[class*="cursor-pointer"]').filter({ hasText: strictRe }))
        .or(shell.getByText(strictRe));

      await expect
        .poll(
          async () => {
            const n = await visibleMatches.count();
            for (let i = 0; i < n; i += 1) {
              const node = visibleMatches.nth(i);
              if (!(await node.isVisible().catch(() => false))) {
                continue;
              }
              const text = ((await node.textContent()) ?? '').trim();
              if (strictRe.test(text)) {
                return false;
              }
            }

            try {
              const clientRow = await this.clientRowHandleInShell(shell, clientRowMatch);
              await this.ensureClientBranchExpandedForRow(clientRow);
              const branchScope = clientRow.locator('xpath=ancestor-or-self::*[@role="treeitem"][1]').or(clientRow);
              const projectUnder = this.projectNodeUnderClientRow(branchScope, projectName).or(
                this.projectNodeUnderClientRow(clientRow, projectName),
              );
              const m = await projectUnder.count();
              for (let j = 0; j < m; j += 1) {
                if (await projectUnder.nth(j).isVisible().catch(() => false)) {
                  return false;
                }
              }
            } catch {
              // Filtered search with no client row — absence in tree is enough.
            }
            return true;
          },
          {
            timeout: 30_000,
            intervals: [500, 1000, 2000],
            message: `Project "${projectName}" should be removed from sidebar tree`,
          },
        )
        .toBe(true);
    });
  }

  public async expectProjectUnderClientHiddenInTree(clientName: string, projectName: string): Promise<void> {
    await test.step(`Hierarchy: project "${projectName}" hidden under collapsed "${clientName}"`, async () => {
      const shell = this.clientTreeAsideOrShell();
      const clientRow = await this.clientRowHandleInShell(shell, clientName);
      await expect(clientRow).toBeVisible({ timeout: 20000 });
      const branchScope = clientRow.locator('xpath=ancestor-or-self::*[@role="treeitem"][1]').or(clientRow);
      const projectUnder = this.projectNodeUnderClientRow(branchScope, projectName).or(
        this.projectNodeUnderClientRow(clientRow, projectName),
      );
      const n = await projectUnder.count();
      if (n > 0) {
        await expect(projectUnder.first()).toBeHidden({ timeout: 15000 });
        return;
      }
      const loose = shell.getByRole('treeitem', { name: new RegExp(escapeForRegex(projectName), 'i') });
      await expect(loose).toHaveCount(0);
    });
  }

  public async searchAndOpenClientDetails(data: ClientSearchScenario): Promise<void> {
    await this.searchClients(data.searchTerm);

    await test.step('Open matching client from results', async () => {
      const escaped = data.clientLabelToSelect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped, 'i');
      const sidebarMatches = this.page.locator('aside').getByText(pattern);
      const count = await sidebarMatches.count();
      const target =
        count > 0 ? sidebarMatches.first() : this.page.getByText(pattern).first();
      await target.waitFor({ state: 'visible', timeout: 15000 });
      await target.click();
    });

    await test.step('Wait for client details to load', async () => {
      await this.actions.waitForNetworkIdle();
      await this.page.waitForTimeout(5000);
    });
  }

  /**
   * **Storyline Generation in Progress** — leave current deliverable while generation runs.
   */
  public async confirmStorylineGenerationLeaveIfPrompted(): Promise<void> {
    await test.step('Confirm Proceed on storyline generation leave dialog', async () => {
      const prompt = this.page
        .getByRole('heading', { name: /Storyline Generation in Progress/i })
        .or(this.page.getByText(/Storyline Generation in Progress/i))
        .first();

      if (!(await prompt.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return;
      }

      const proceed = this.page.getByRole('button', { name: /^Proceed$/i });
      await expect(proceed).toBeVisible({ timeout: 10_000 });
      await proceed.click();
      await expect(prompt).not.toBeVisible({ timeout: 15_000 });
    });
  }

  /**
   * Visible sidebar row for `deliverableName` (newest match when several share the same label).
   */
  public async resolveDeliverableRowUnderProject(
    clientRowMatch: string,
    projectName: string,
    deliverableName: string,
  ): Promise<Locator> {
    const shell = this.clientTreeAsideOrShell();
    const strictRe = new RegExp(`^${escapeForRegex(deliverableName)}$`, 'i');
    const pointerRow = shell.locator('[class*="cursor-pointer"]').filter({ hasText: strictRe });
    const treeRow = shell.getByRole('treeitem', { name: strictRe });

    let resolved: Locator | null = null;
    await expect
      .poll(
        async () => {
          const direct = treeRow.or(pointerRow);
          const n = await direct.count();
          for (let i = n - 1; i >= 0; i -= 1) {
            const row = direct.nth(i);
            if (!(await row.isVisible().catch(() => false))) {
              continue;
            }
            const text = ((await row.textContent()) ?? '').trim();
            if (strictRe.test(text)) {
              resolved = row;
              return true;
            }
          }

          const scoped = await this.findDeliverableRowInTree(shell, deliverableName, {
            clientLabel: clientRowMatch,
            projectLabel: projectName,
          });
          if (scoped && (await scoped.isVisible().catch(() => false))) {
            resolved = scoped;
            return true;
          }
          return false;
        },
        {
          timeout: 45_000,
          intervals: [500, 1000, 2000],
          message: `Visible deliverable row "${deliverableName}" (project "${projectName}", client "${clientRowMatch}")`,
        },
      )
      .toBe(true);

    if (!resolved) {
      throw new Error(
        `Deliverable row "${deliverableName}" was not resolved (project "${projectName}", client "${clientRowMatch}")`,
      );
    }
    return resolved;
  }

  public async expectDeliverableNestedUnderProjectInTree(
    clientRowMatch: string,
    projectName: string,
    deliverableName: string,
  ): Promise<void> {
    await test.step(
      `Hierarchy: deliverable "${deliverableName}" under project "${projectName}" (client "${clientRowMatch}")`,
      async () => {
        await this.resolveDeliverableRowUnderProject(clientRowMatch, projectName, deliverableName);
      },
    );
  }

  public async expectDeliverableAbsentInTree(
    clientRowMatch: string,
    projectName: string,
    deliverableName: string,
  ): Promise<void> {
    await test.step(
      `Hierarchy: deliverable "${deliverableName}" absent (project "${projectName}", client "${clientRowMatch}")`,
      async () => {
        const shell = this.clientTreeAsideOrShell();
        const strictRe = new RegExp(`^${escapeForRegex(deliverableName)}$`, 'i');
        const visibleMatches = shell
          .getByRole('treeitem', { name: strictRe })
          .or(shell.locator('[class*="cursor-pointer"]').filter({ hasText: strictRe }))
          .or(shell.getByText(strictRe));

        await expect
          .poll(
            async () => {
              const n = await visibleMatches.count();
              for (let i = 0; i < n; i += 1) {
                const node = visibleMatches.nth(i);
                if (!(await node.isVisible().catch(() => false))) {
                  continue;
                }
                const text = ((await node.textContent()) ?? '').trim();
                if (strictRe.test(text)) {
                  return false;
                }
              }

              const scoped = await this.findDeliverableRowInTree(shell, deliverableName, {
                clientLabel: clientRowMatch,
                projectLabel: projectName,
              });
              if (scoped && (await scoped.isVisible().catch(() => false))) {
                return false;
              }
              return true;
            },
            {
              timeout: 30_000,
              intervals: [500, 1000, 2000],
              message: `Deliverable "${deliverableName}" should be removed from sidebar tree`,
            },
          )
          .toBe(true);
      },
    );
  }

  /**
   * Open an existing deliverable from the sidebar tree (search → expand → click row).
   * Reuses tree helpers from client/project search flows.
   */
  /** Expand client → project in the sidebar tree without typing into Search Clients. */
  private async expandClientProjectTreeInShell(
    clientLabel: string,
    projectLabel: string,
  ): Promise<void> {
    const shell = this.clientTreeAsideOrShell();

    try {
      const clientRow =
        (await this.clientRowWithExactLabel(shell, clientLabel)) ??
        (await this.clientRowHandleInShell(shell, clientLabel));
      await clientRow.scrollIntoViewIfNeeded();
      await this.ensureClientBranchExpandedForRow(clientRow, 400);
      await this.ensureClientBranchExpandedForRow(clientRow, 400);

      const projectCandidates = this.projectNodeUnderClientRow(clientRow, projectLabel);
      const projectRe = new RegExp(`^${escapeForRegex(projectLabel)}$`, 'i');
      const projectRow = await this.firstVisibleExactTextMatch(projectCandidates, projectRe);
      if (projectRow) {
        await projectRow.scrollIntoViewIfNeeded();
        await this.ensureClientBranchExpandedForRow(projectRow, 400);
      }
    } catch {
      // Tree may still be searchable by deliverable name below.
    }
  }

  /**
   * Locate a deliverable row — always type the **deliverable name** in Search Clients first (never the client name).
   */
  private async resolveDeliverableRowInSidebar(
    label: string,
    options?: { clientLabel?: string; projectLabel?: string },
  ): Promise<Locator | null> {
    const shell = this.clientTreeAsideOrShell();
    const clientLabel = options?.clientLabel?.trim();
    const projectLabel = options?.projectLabel?.trim();

    await this.searchClients(label);
    await this.page.waitForTimeout(400);
    let target = await this.findDeliverableRowInTree(shell, label, options);
    if (target) {
      return target;
    }

    await this.clearClientSearch();
    await this.page.waitForTimeout(400);
    if (clientLabel && projectLabel) {
      await this.expandClientProjectTreeInShell(clientLabel, projectLabel);
      target = await this.findDeliverableRowInTree(shell, label, options);
    }

    return target;
  }

  /**
   * Open the first deliverable found in the sidebar (primary name, then fallbacks).
   * @returns The deliverable label that was opened.
   */
  public async openDeliverableFromSidebarWithFallback(
    deliverableNames: string[],
    options?: {
      clientLabel?: string;
      projectLabel?: string;
      confirmStorylineLeave?: boolean;
      skipStageReadyWait?: boolean;
      waitUntilLeftDeliverable?: string;
    },
  ): Promise<string> {
    const candidates = [...new Set(deliverableNames.map((n) => n.trim()).filter((n) => n.length > 0))];
    if (candidates.length === 0) {
      throw new Error('At least one deliverable name is required.');
    }

    const errors: string[] = [];
    for (const label of candidates) {
      try {
        await this.openDeliverableFromSidebar(label, options);
        return label;
      } catch (error) {
        errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
        await this.clearClientSearch().catch(() => undefined);
        await this.page.waitForTimeout(300);
      }
    }

    throw new Error(
      `No deliverable found in sidebar tree. Tried: ${candidates.join(', ')}. Details: ${errors.join(' | ')}`,
    );
  }

  public async openDeliverableFromSidebar(
    deliverableName: string,
    options?: {
      clientLabel?: string;
      projectLabel?: string;
      /** Click **Proceed** when leaving a deliverable with storyline generation in progress. */
      confirmStorylineLeave?: boolean;
      /** Skip Brief stepper wait (e.g. generated deliverable / 3. Deliverable view). */
      skipStageReadyWait?: boolean;
      /** After navigation, wait until this deliverable is no longer shown in the main header. */
      waitUntilLeftDeliverable?: string;
    },
  ): Promise<void> {
    const label = deliverableName.trim();
    if (!label) {
      throw new Error('Deliverable name must be non-empty.');
    }

    await test.step(`Open deliverable "${label}" from sidebar`, async () => {
      const clientLabel = options?.clientLabel?.trim();
      let target: Locator | null = null;

      await this.clearClientSearch();
      await this.searchClients(label);

      await expect
        .poll(
          async () => {
            target = await this.findDeliverableRowInTree(
              this.clientTreeAsideOrShell(),
              label,
              options,
            );
            return target !== null;
          },
          {
            timeout: 45_000,
            intervals: [500, 1000, 2000, 3000],
            message: `Deliverable "${label}" should appear after searching in Search Clients`,
          },
        )
        .toBe(true);

      if (!target) {
        target = await this.resolveDeliverableRowInSidebar(label, options);
      }

      if (!target) {
        throw new Error(
          `Deliverable "${label}" not found in sidebar tree` +
            (clientLabel && options?.projectLabel
              ? ` (expanded: ${clientLabel} → ${options.projectLabel}; searched: "${label}")`
              : ` (searched: "${label}")`) +
            '.',
        );
      }

      await target.scrollIntoViewIfNeeded();
      await target.click();

      if (options?.confirmStorylineLeave) {
        await this.confirmStorylineGenerationLeaveIfPrompted();
      }

      await this.page.waitForLoadState('domcontentloaded');

      if (options?.skipStageReadyWait) {
        const leftName = options?.waitUntilLeftDeliverable?.trim();
        if (leftName) {
          const leftRe = new RegExp(`^${escapeForRegex(leftName)}$`, 'i');
          await expect(this.page.getByRole('heading', { name: leftRe, level: 2 })).not.toBeVisible({
            timeout: 20_000,
          });
        }

        try {
          await this.waitForDeliverableOpenInMainView(label, 12_000);
        } catch {
          await target.scrollIntoViewIfNeeded();
          await target.click();
          if (options?.confirmStorylineLeave) {
            await this.confirmStorylineGenerationLeaveIfPrompted();
          }
          await this.page.waitForLoadState('domcontentloaded');
          await this.waitForDeliverableOpenInMainView(label, 20_000);
        }
      } else {
        await expect(this.page.getByRole('button', { name: /1\.\s*Brief/i }).or(
          this.page.getByRole('button', { name: /^1$/ }),
        ).first()).toBeVisible({ timeout: 12_000 });
      }
    });
  }
}
