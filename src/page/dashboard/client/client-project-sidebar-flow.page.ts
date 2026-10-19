import type {
  ClientProjectFlowProjectInput,
  ClientProjectFlowTestCaseData,
} from '@interface/dashboard/client-project-flow.interface';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';
import { ClientPage, type ClientData } from '@page/dashboard/client/client.page';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { ProjectPage } from '@page/dashboard/project/project.page';

/**
 * End-to-end hierarchy: **client** (created first) → **project** under that client (sidebar add on the client row,
 * then wizard) → **deliverable** under that project (project detail **Deliverables** **+**, when
 * {@link ClientProjectFlowProjectInput.deliverableBrief} is set) → verification in the sidebar tree.
 * For a **guaranteed** deliverable step, use {@link runWholeClientProjectDeliverableWorkflow}.
 */
export class ClientProjectSidebarFlowPage {
  private readonly page: Page;
  private readonly clientPage: ClientPage;
  private readonly projectPage: ProjectPage;
  private readonly clientSearchPage: ClientSearchPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientPage = new ClientPage(page, testInfo);
    this.projectPage = new ProjectPage(page, testInfo);
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
  }

  /**
   * **Whole workflow** (client → project → deliverable → tree verify): same as
   * {@link runCreateClientAddProjectAndVerifyHierarchy} but **requires**
   * `scenario.project.deliverableBrief` so step 5 is never skipped by mistake.
   */
  public async runWholeClientProjectDeliverableWorkflow(
    bundle: ClientProjectFlowTestCaseData,
    uniqueClientSuffix: string,
    uniqueProjectName: string,
  ): Promise<void> {
    const brief = bundle.scenario.project.deliverableBrief?.trim();
    if (!brief) {
      throw new Error(
        'Whole workflow requires scenario.project.deliverableBrief (create client → project → deliverable → verify tree).',
      );
    }
    await this.runCreateClientAddProjectAndVerifyHierarchy(bundle, uniqueClientSuffix, uniqueProjectName);
  }

  /**
   * Ordered hierarchy (matches Playwright step titles):
   * 1. **Create client** (root).
   * 2. **Under that client** — add first project from the client’s sidebar row (+).
   * 3. **Project wizard** — Generate path for that client’s project.
   * 4. **Finish project** — review name/dates → Create Project (project exists under that client).
   * 5. **Under that project** — on project detail, first deliverable via Deliverables (+) when `deliverableBrief` is set.
   * 6. **Verify** — go home, search by project name, assert project nested under that client in the tree.
   */
  public async runCreateClientAddProjectAndVerifyHierarchy(
    bundle: ClientProjectFlowTestCaseData,
    uniqueClientSuffix: string,
    uniqueProjectName: string,
  ): Promise<void> {
    const { scenario } = bundle;
    const clientData: ClientData = {
      name: `${scenario.client.name} ${uniqueClientSuffix}`,
      website: scenario.client.website,
      industry: scenario.client.industry,
      ...(scenario.client.description ? { description: scenario.client.description } : {}),
    };

    const projectInput: ClientProjectFlowProjectInput = {
      ...scenario.project,
      projectName: uniqueProjectName,
    };

    await test.step('Open application (cookie session)', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step('1 — Create client (root)', async () => {
      await this.clientPage.createClient(clientData);
      await this.clientPage.waitForNewClientFormClosed();
    });

    await test.step(`2 — Under client "${clientData.name}": add first project from sidebar`, async () => {
      await this.clientPage.hoverSidebarClientAndClickAddProject(clientData.name);
      await this.projectPage.waitForNewProjectFlowVisible();
    });

    await test.step('3 — Complete new-project wizard for that client’s project (Generate path)', async () => {
      await this.projectPage.runWizardThroughGenerate(projectInput);
    });

    await test.step('4 — Name + dates: submit so project is created under that client', async () => {
      await this.projectPage.fillReviewStepProjectNameDatesAndSubmit(projectInput, uniqueProjectName);
      await this.projectPage.waitForProjectCreateWizardClosed();
    });

    const deliverableBrief = scenario.project.deliverableBrief?.trim();
    if (deliverableBrief) {
      await test.step(`5 — Under project "${uniqueProjectName}": create first deliverable on project detail`, async () => {
        await this.projectPage.createFirstDeliverableFromProjectDetail(deliverableBrief);
      });
    }

    await test.step('6 — Verify: search by project name, nested under created client', async () => {
      await gotoAppHomeWithSession(this.page);
      await this.page.waitForLoadState('networkidle');
      await this.clientSearchPage.searchByProjectNameThenExpectProjectNestedUnderClient(
        uniqueProjectName,
        uniqueClientSuffix,
      );
    });
  }

  /**
   * @deprecated Use {@link runCreateClientAddProjectAndVerifyHierarchy} (empty-name validation removed).
   */
  public async runEmptyProjectNameInactiveThenCreateAndVerifyHierarchy(
    bundle: ClientProjectFlowTestCaseData,
    uniqueClientSuffix: string,
    uniqueProjectName: string,
  ): Promise<void> {
    await this.runCreateClientAddProjectAndVerifyHierarchy(bundle, uniqueClientSuffix, uniqueProjectName);
  }

  /**
   * @deprecated Use {@link runCreateClientAddProjectAndVerifyHierarchy}.
   */
  public async runBlankNameThenValidProjectTreeAndSearch(
    bundle: ClientProjectFlowTestCaseData,
    uniqueClientSuffix: string,
    uniqueProjectName: string,
  ): Promise<void> {
    await this.runCreateClientAddProjectAndVerifyHierarchy(bundle, uniqueClientSuffix, uniqueProjectName);
  }
}
