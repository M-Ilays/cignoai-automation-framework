import type {
  ClientProjectFlowClientInput,
  ClientProjectFlowTestCaseData,
} from '@interface/dashboard/client-project-flow.interface';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';
import { ClientPage, type ClientData } from '@page/dashboard/client/client.page';
import { ProjectPage } from '@page/dashboard/project/project.page';

/**
 * Composes {@link ClientPage} + {@link ProjectPage} for full E2E journeys.
 * Specs pass {@link ClientProjectFlowTestCaseData} from the data layer (scenario + testCaseData).
 */
export class ClientProjectFlowPage {
  private readonly page: Page;
  private readonly clientPage: ClientPage;
  private readonly projectPage: ProjectPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientPage = new ClientPage(page, testInfo);
    this.projectPage = new ProjectPage(page, testInfo);
  }

  /**
   * E2E: create client → sidebar hover on that client → row plus → first project via AI description + submit.
   * Uses {@link ClientProjectFlowTestCaseData.scenario} for all UI inputs; metadata is available for reporting hooks.
   */
  public async runCreateClientAndFirstAiProject(testCase: ClientProjectFlowTestCaseData): Promise<void> {
    const { scenario, testCaseData } = testCase;

    await test.step(`Open application (${testCaseData.testCase ?? 'client-project-flow'}, cookie session)`, async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step('Create client', async () => {
      await this.clientPage.createClient(this.toClientData(scenario.client));
    });

    await test.step('Sidebar: hover new client and click plus to add project', async () => {
      await this.clientPage.waitForNewClientFormClosed();
      await this.page.waitForTimeout(200);
      await this.clientPage.hoverSidebarClientAndClickAddProject(scenario.client.name);
    });

    await test.step('Complete first project using AI description path', async () => {
      await this.projectPage.waitForNewProjectFlowVisible();
      await this.projectPage.continueFirstProjectAiWizard(scenario.project);
    });
  }

  private toClientData(client: ClientProjectFlowClientInput): ClientData {
    return {
      name: client.name,
      website: client.website,
      industry: client.industry,
      ...(client.description ? { description: client.description } : {}),
    };
  }
}
