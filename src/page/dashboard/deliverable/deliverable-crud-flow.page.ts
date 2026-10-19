import type { DeliverableCrudTestCaseData } from '@interface/dashboard/deliverable-crud.interface';
import { Page, test, TestInfo } from '@playwright/test';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverableCrudPage } from '@page/dashboard/deliverable/deliverable-crud.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/**
 * TC-019 — deliverable CRUD:
 * **C** dashboard create + Generate (TC-008) → **R** read → **U** → **R** → **D** → **R** → isolation.
 */
const TC019_SEARCH_DELETE_PAUSE_MS = 2000;

export class DeliverableCrudFlowPage {
  private readonly page: Page;
  private readonly deliverablePage: DeliverablePage;
  private readonly deliverableCrudPage: DeliverableCrudPage;
  private readonly clientSearchPage: ClientSearchPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.deliverablePage = new DeliverablePage(page, testInfo);
    this.deliverableCrudPage = new DeliverableCrudPage(page, testInfo);
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
  }

  public async runDeliverableCrudWorkflow(
    bundle: DeliverableCrudTestCaseData,
    uniqueInitialDeliverableName: string,
    uniqueUpdatedDeliverableName: string,
  ): Promise<void> {
    const { scenario } = bundle;
    const clientLabel = scenario.existingClientLabel;
    const projectLabel = scenario.existingProjectLabel;
    const { isolationReference } = scenario;

    await test.step('Open application', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step(
      `C — Create "${uniqueInitialDeliverableName}" from dashboard and Generate (TC-008 full create)`,
      async () => {
        await this.deliverablePage.runDashboardDeliverableCreateWithGeneration({
          deliverableBrief: scenario.deliverableBrief,
          standardProjectName: scenario.standardProjectName,
          geographicalScope: scenario.geographicalScope,
          businessScope: scenario.businessScope,
          clientSearchTerm: scenario.clientSearchTerm,
          projectName: projectLabel,
          deliverableName: uniqueInitialDeliverableName,
          generationProgressTimeoutMs: scenario.generationProgressTimeoutMs,
        });
      },
    );

    await test.step(`R — Read generated deliverable "${uniqueInitialDeliverableName}"`, async () => {
      await this.deliverablePage.assertGeneratedDeliverableReadable();
      await this.clientSearchPage.waitForDeliverableOpenInMainView(uniqueInitialDeliverableName, 30_000);

      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueInitialDeliverableName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectDeliverableNestedUnderProjectInTree(
        clientLabel,
        projectLabel,
        uniqueInitialDeliverableName,
      );
    });

    await test.step(`U — Rename deliverable to "${uniqueUpdatedDeliverableName}"`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueInitialDeliverableName);
      await this.pauseForSearchOrDelete();
      const deliverableRow = await this.clientSearchPage.resolveDeliverableRowUnderProject(
        clientLabel,
        projectLabel,
        uniqueInitialDeliverableName,
      );
      await this.deliverableCrudPage.renameDeliverableFromTreeRow(
        deliverableRow,
        uniqueUpdatedDeliverableName,
      );
    });

    await test.step(`R — Verify renamed deliverable "${uniqueUpdatedDeliverableName}" in tree`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedDeliverableName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectDeliverableNestedUnderProjectInTree(
        clientLabel,
        projectLabel,
        uniqueUpdatedDeliverableName,
      );
      await this.clientSearchPage.searchClients(uniqueUpdatedDeliverableName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectDeliverableAbsentInTree(
        clientLabel,
        projectLabel,
        uniqueInitialDeliverableName,
      );
    });

    await test.step(`D — Delete deliverable "${uniqueUpdatedDeliverableName}"`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedDeliverableName);
      await this.pauseForSearchOrDelete();
      const deliverableRow = await this.clientSearchPage.resolveDeliverableRowUnderProject(
        clientLabel,
        projectLabel,
        uniqueUpdatedDeliverableName,
      );
      await this.pauseForSearchOrDelete();
      await this.deliverableCrudPage.deleteDeliverableFromTreeRow(deliverableRow);
    });

    await test.step('R — Verify deleted deliverable removed from tree', async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedDeliverableName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectDeliverableAbsentInTree(
        clientLabel,
        projectLabel,
        uniqueUpdatedDeliverableName,
      );
    });

    await test.step('Isolation — shared deliverable under same project unchanged', async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(isolationReference.deliverableLabel);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectDeliverableNestedUnderProjectInTree(
        isolationReference.clientLabel,
        isolationReference.projectLabel,
        isolationReference.deliverableLabel,
      );
    });
  }

  private async goHomeForTreeVerification(): Promise<void> {
    await gotoAppHomeWithSession(this.page);
    await this.page.waitForLoadState('load');
  }

  private async pauseForSearchOrDelete(): Promise<void> {
    await this.page.waitForTimeout(TC019_SEARCH_DELETE_PAUSE_MS);
  }
}
