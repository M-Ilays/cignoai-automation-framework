import { expect, Locator, Page, test, TestInfo } from '@playwright/test';
import { PlaywrightActionsFactory } from '@utilities/playwright/playwright-actions.utils';

const DELETE_STEP_PAUSE_MS = 2000;

export class ClientCrudPage {
  private readonly page: Page;
  private readonly actions: PlaywrightActionsFactory;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.actions = new PlaywrightActionsFactory(page, testInfo);
  }

  private clientRowToolbarScope(clientRow: Locator): Locator {
    return clientRow.locator('xpath=ancestor-or-self::*[contains(@class,"cursor-pointer")][1]').or(clientRow);
  }

  private async openClientRowActionsPopover(clientRow: Locator): Promise<void> {
    if (await this.page.getByRole('button', { name: /^Rename$/i }).first().isVisible().catch(() => false)) {
      return;
    }

    const scope = this.clientRowToolbarScope(clientRow);
    await scope.hover();
    const buttons = scope.locator('button');
    const count = await buttons.count();
    if (count >= 2) {
      await buttons.nth(1).click({ force: true });
    } else if (count === 1) {
      await buttons.nth(0).click({ force: true });
    } else {
      throw new Error('No client row toolbar buttons found');
    }
    await this.page.getByRole('button', { name: /^Rename$/i }).first().waitFor({ state: 'visible', timeout: 8000 });
  }

  private async clickClientRowToolbarAction(clientRow: Locator, action: 'edit' | 'delete'): Promise<void> {
    await clientRow.scrollIntoViewIfNeeded();
    await this.openClientRowActionsPopover(clientRow);

    const actionName = action === 'edit' ? /^Rename$/i : /^Delete$/i;
    await this.page.getByRole('button', { name: actionName }).first().click({ force: true });
  }

  private async fillFieldWithReactSync(field: Locator, value: string): Promise<void> {
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await field.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await field.fill(value);
    await field.evaluate((el: HTMLElement, v: string) => {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        setter.call(el, v);
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  public async renameClientFromTreeRow(clientRow: Locator, newName: string): Promise<void> {
    await test.step(`Update client name to "${newName}"`, async () => {
      await this.clickClientRowToolbarAction(clientRow, 'edit');

      const inlineField = this.page
        .getByRole('textbox', { name: /Edit client name/i })
        .or(this.page.getByPlaceholder(/^Client name$/i))
        .or(this.page.getByPlaceholder(/Enter client name/i))
        .first();
      await inlineField.waitFor({ state: 'visible', timeout: 15_000 });
      await this.fillFieldWithReactSync(inlineField, newName);
      await inlineField.press('Enter');
      await expect(inlineField).not.toBeVisible({ timeout: 15_000 }).catch(() => {});
      await this.actions.waitForNetworkIdle();
    });
  }

  public async deleteClientFromTreeRow(clientRow: Locator): Promise<void> {
    await test.step('Delete client from sidebar tree', async () => {
      await this.clickClientRowToolbarAction(clientRow, 'delete');
      await this.page.waitForTimeout(DELETE_STEP_PAUSE_MS);

      const confirmDialog = this.page
        .locator('[role="dialog"], [aria-modal="true"]')
        .filter({ hasText: /delete|remove|cannot be undone|permanently|client/i })
        .first();

      const confirmVisible = await confirmDialog.isVisible({ timeout: 8_000 }).catch(() => false);
      if (confirmVisible) {
        await this.page.waitForTimeout(DELETE_STEP_PAUSE_MS);
        const confirmBtn = confirmDialog
          .getByRole('button', { name: /^Delete$|^Confirm$|^Yes|^Remove client/i })
          .or(this.page.getByRole('button', { name: /^Delete$|^Confirm$|^Yes, delete/i }))
          .first();
        await confirmBtn.click({ force: true });
      } else {
        const fallback = this.page.getByRole('button', { name: /^Delete$|^Confirm$|^Yes, delete/i }).first();
        if (await fallback.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await this.page.waitForTimeout(DELETE_STEP_PAUSE_MS);
          await fallback.click({ force: true });
        }
      }

      await this.page.waitForTimeout(DELETE_STEP_PAUSE_MS);
      await this.actions.waitForNetworkIdle();
      await confirmDialog.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
    });
  }
}
