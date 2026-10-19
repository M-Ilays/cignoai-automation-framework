import type { ClientCrudTestCaseData } from '@interface/dashboard/client-crud.interface';
import type { ClientData } from '@page/dashboard/client/client.page';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';
import { ClientCrudPage } from '@page/dashboard/client/client-crud.page';
import { ClientPage } from '@page/dashboard/client/client.page';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';

/**
 * TC-021 — client CRUD on a **new disposable** client:
 * Create → Read (tree) → Update (rename) → Read → Delete → Read + `automation` unchanged.
 */
const TC021_SEARCH_DELETE_PAUSE_MS = 2000;

export class ClientCrudFlowPage {
  private readonly page: Page;
  private readonly clientPage: ClientPage;
  private readonly clientCrudPage: ClientCrudPage;
  private readonly clientSearchPage: ClientSearchPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientPage = new ClientPage(page, testInfo);
    this.clientCrudPage = new ClientCrudPage(page, testInfo);
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
  }

  public async runClientCrudWorkflow(
    bundle: ClientCrudTestCaseData,
    uniqueInitialClientName: string,
    uniqueUpdatedClientName: string,
  ): Promise<void> {
    const { scenario } = bundle;
    const clientData: ClientData = {
      name: uniqueInitialClientName,
      ...scenario.createClient,
    };
    const { isolationReference } = scenario;

    await test.step('Open application (cookie session)', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step(`C — Create client "${uniqueInitialClientName}"`, async () => {
      await this.clientPage.createClient(clientData);
      await this.clientPage.waitForNewClientFormClosed();
    });

    await test.step(`R — Verify "${uniqueInitialClientName}" in tree`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueInitialClientName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectClientVisibleInTree(uniqueInitialClientName);
    });

    await test.step(`U — Rename client to "${uniqueUpdatedClientName}"`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueInitialClientName);
      await this.pauseForSearchOrDelete();
      const clientRow = await this.clientSearchPage.resolveClientRowInTree(uniqueInitialClientName);
      await this.clientCrudPage.renameClientFromTreeRow(clientRow, uniqueUpdatedClientName);
    });

    await test.step(`R — Verify renamed client "${uniqueUpdatedClientName}" in tree`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedClientName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectClientVisibleInTree(uniqueUpdatedClientName);
      await this.clientSearchPage.searchClients(uniqueUpdatedClientName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectClientAbsentInTree(uniqueInitialClientName);
    });

    await test.step(`D — Delete client "${uniqueUpdatedClientName}"`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedClientName);
      await this.pauseForSearchOrDelete();
      const clientRow = await this.clientSearchPage.resolveClientRowInTree(uniqueUpdatedClientName);
      await this.pauseForSearchOrDelete();
      await this.clientCrudPage.deleteClientFromTreeRow(clientRow);
    });

    await test.step('R — Verify deleted client removed from tree', async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedClientName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectClientAbsentInTree(uniqueUpdatedClientName);
    });

    await test.step('Isolation — existing automation client unchanged', async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(isolationReference.clientLabel);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectClientVisibleInTree(isolationReference.clientLabel);
    });
  }

  private async goHomeForTreeVerification(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('load');
  }

  private async pauseForSearchOrDelete(): Promise<void> {
    await this.page.waitForTimeout(TC021_SEARCH_DELETE_PAUSE_MS);
  }
}
