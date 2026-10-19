import type { ClientProjectFlowProjectInput } from '@interface/dashboard/client-project-flow.interface';
import type { ProjectCrudTestCaseData } from '@interface/dashboard/project-crud.interface';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';
import { ClientPage } from '@page/dashboard/client/client.page';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { ProjectCrudPage } from '@page/dashboard/project/project-crud.page';
import { ProjectPage } from '@page/dashboard/project/project.page';

/**
 * TC-020 — project CRUD on an **existing** client (`automation`):
 * Create project → Read (tree) → Update → Read → Delete → Read + isolation on shared fixtures.
 */
/** Pause so search / delete steps are visible in headed runs (TC-020). */
const TC020_SEARCH_DELETE_PAUSE_MS = 2000;

export class ProjectCrudFlowPage {
  private readonly page: Page;
  private readonly clientPage: ClientPage;
  private readonly projectPage: ProjectPage;
  private readonly projectCrudPage: ProjectCrudPage;
  private readonly clientSearchPage: ClientSearchPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientPage = new ClientPage(page, testInfo);
    this.projectPage = new ProjectPage(page, testInfo);
    this.projectCrudPage = new ProjectCrudPage(page, testInfo);
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
  }

  public async runProjectCrudWorkflow(
    bundle: ProjectCrudTestCaseData,
    uniqueInitialProjectName: string,
    uniqueUpdatedProjectName: string,
  ): Promise<void> {
    const { scenario } = bundle;
    const clientLabel = scenario.existingClientLabel;
    const projectInput: ClientProjectFlowProjectInput = {
      ...scenario.project,
      projectName: uniqueInitialProjectName,
    };
    const { isolationReference } = scenario;

    await test.step('Open application (cookie session)', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step(`C — Create new project under existing client "${clientLabel}"`, async () => {
      await this.clientSearchPage.searchClients(clientLabel);
      await this.pauseForSearchOrDelete();
      await this.clientPage.hoverSidebarClientAndClickAddProject(clientLabel);
      await this.projectPage.waitForNewProjectFlowVisible();
      await this.projectPage.runWizardThroughGenerate(projectInput);
      await this.projectPage.fillReviewStepProjectNameDatesAndSubmit(projectInput, uniqueInitialProjectName);
      await this.projectPage.waitForProjectCreateWizardClosed();
    });

    await test.step(`R — Verify "${uniqueInitialProjectName}" in tree`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueInitialProjectName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectProjectNestedUnderClientInTree(
        clientLabel,
        uniqueInitialProjectName,
      );
    });

    await test.step(`U — Rename project to "${uniqueUpdatedProjectName}"`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueInitialProjectName);
      await this.pauseForSearchOrDelete();
      const projectRow = await this.clientSearchPage.resolveProjectRowUnderClient(
        clientLabel,
        uniqueInitialProjectName,
      );
      await this.projectCrudPage.renameProjectFromTreeRow(projectRow, uniqueUpdatedProjectName);
    });

    await test.step(`R — Verify renamed project "${uniqueUpdatedProjectName}" in tree`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedProjectName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectProjectNestedUnderClientInTree(
        clientLabel,
        uniqueUpdatedProjectName,
      );
      await this.clientSearchPage.searchClients(uniqueUpdatedProjectName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectProjectAbsentUnderClientInTree(
        clientLabel,
        uniqueInitialProjectName,
      );
    });

    await test.step(`D — Delete project "${uniqueUpdatedProjectName}"`, async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedProjectName);
      await this.pauseForSearchOrDelete();
      const projectRow = await this.clientSearchPage.resolveProjectRowUnderClient(
        clientLabel,
        uniqueUpdatedProjectName,
      );
      await this.pauseForSearchOrDelete();
      await this.projectCrudPage.deleteProjectFromTreeRow(projectRow);
    });

    await test.step('R — Verify deleted project removed from tree', async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(uniqueUpdatedProjectName);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectProjectAbsentUnderClientInTree(
        clientLabel,
        uniqueUpdatedProjectName,
      );
    });

    await test.step('Isolation — shared project under same client unchanged', async () => {
      await this.goHomeForTreeVerification();
      await this.clientSearchPage.searchClients(isolationReference.clientLabel);
      await this.pauseForSearchOrDelete();
      await this.clientSearchPage.expectProjectNestedUnderClientInTree(
        isolationReference.clientLabel,
        isolationReference.projectLabel,
      );
    });
  }

  private async goHomeForTreeVerification(): Promise<void> {
      await gotoAppHomeWithSession(this.page);
  }

  private async pauseForSearchOrDelete(): Promise<void> {
    await this.page.waitForTimeout(TC020_SEARCH_DELETE_PAUSE_MS);
  }
}
