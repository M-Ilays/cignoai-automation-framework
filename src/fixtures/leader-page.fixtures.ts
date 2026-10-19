import { test as base, Page } from '@playwright/test';
import { LoginPage } from '@page/login/login.page';
import { ClientPage } from '@page/dashboard/client/client.page';
import { ClientProjectFlowPage } from '@page/dashboard/client/client-project-flow.page';
import { ClientProjectSidebarFlowPage } from '@page/dashboard/client/client-project-sidebar-flow.page';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { ProjectPage } from '@page/dashboard/project/project.page';
import { DashboardDeliverableFlowPage } from '@page/dashboard/deliverable/dashboard-deliverable-flow.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { DeliverableStageNavigationFlowPage } from '@page/dashboard/deliverable/deliverable-stage-navigation-flow.page';
import { NewDeliverableSettingsFlowPage } from '@page/dashboard/deliverable/new-deliverable-settings-flow.page';
import { ImproveMyBriefFlowPage } from '@page/dashboard/deliverable/improve-my-brief-flow.page';
import { DeliverableSettingsSourceFlowPage } from '@page/dashboard/deliverable/deliverable-settings-source-flow.page';
import { ChatAssistantFlowPage } from '@page/dashboard/deliverable/chat-assistant-flow.page';
import { DeliverableExportFlowPage } from '@page/dashboard/deliverable/deliverable-export-flow.page';
import { DeliverableExportLoaderFlowPage } from '@page/dashboard/deliverable/deliverable-export-loader-flow.page';
import { DeliverableEditsSyncFlowPage } from '@page/dashboard/deliverable/deliverable-edits-sync-flow.page';
import { ProjectCrudFlowPage } from '@page/dashboard/client/project-crud-flow.page';
import { ProjectCrudPage } from '@page/dashboard/project/project-crud.page';
import { ClientCrudFlowPage } from '@page/dashboard/client/client-crud-flow.page';
import { ClientCrudPage } from '@page/dashboard/client/client-crud.page';
import { DeliverableCrudFlowPage } from '@page/dashboard/deliverable/deliverable-crud-flow.page';
import { DeliverableCrudPage } from '@page/dashboard/deliverable/deliverable-crud.page';
import { DeliverableReadUpdateFlowPage } from '@page/dashboard/deliverable/deliverable-read-update-flow.page';
import { DeliverableReadUpdatePage } from '@page/dashboard/deliverable/deliverable-read-update.page';

type TestFixtures = {
  leaderLoginPage: LoginPage;
  clientPage: ClientPage;
  clientSearchPage: ClientSearchPage;
  projectPage: ProjectPage;
  deliverablePage: DeliverablePage;
  clientProjectFlowPage: ClientProjectFlowPage;
  clientProjectSidebarFlowPage: ClientProjectSidebarFlowPage;
  dashboardDeliverableFlowPage: DashboardDeliverableFlowPage;
  deliverableStageNavigationFlowPage: DeliverableStageNavigationFlowPage;
  newDeliverableSettingsFlowPage: NewDeliverableSettingsFlowPage;
  improveMyBriefFlowPage: ImproveMyBriefFlowPage;
  deliverableSettingsSourceFlowPage: DeliverableSettingsSourceFlowPage;
  chatAssistantFlowPage: ChatAssistantFlowPage;
  deliverableExportFlowPage: DeliverableExportFlowPage;
  deliverableExportLoaderFlowPage: DeliverableExportLoaderFlowPage;
  deliverableEditsSyncFlowPage: DeliverableEditsSyncFlowPage;
  projectCrudPage: ProjectCrudPage;
  projectCrudFlowPage: ProjectCrudFlowPage;
  clientCrudPage: ClientCrudPage;
  clientCrudFlowPage: ClientCrudFlowPage;
  deliverableCrudPage: DeliverableCrudPage;
  deliverableCrudFlowPage: DeliverableCrudFlowPage;
  deliverableReadUpdatePage: DeliverableReadUpdatePage;
  deliverableReadUpdateFlowPage: DeliverableReadUpdateFlowPage;
};

export const test = base.extend<TestFixtures>({
  leaderLoginPage: async ({ page }: { page: Page }, use: (r: LoginPage) => Promise<void>) => {
    await use(new LoginPage(page, base.info()));
  },
  clientPage: async ({ page }: { page: Page }, use: (r: ClientPage) => Promise<void>) => {
    await use(new ClientPage(page, base.info()));
  },
  clientSearchPage: async ({ page }: { page: Page }, use: (r: ClientSearchPage) => Promise<void>) => {
    await use(new ClientSearchPage(page, base.info()));
  },
  projectPage: async ({ page }: { page: Page }, use: (r: ProjectPage) => Promise<void>) => {
    await use(new ProjectPage(page, base.info()));
  },
  deliverablePage: async ({ page }: { page: Page }, use: (r: DeliverablePage) => Promise<void>) => {
    await use(new DeliverablePage(page, base.info()));
  },
  clientProjectFlowPage: async ({ page }: { page: Page }, use: (r: ClientProjectFlowPage) => Promise<void>) => {
    await use(new ClientProjectFlowPage(page, base.info()));
  },
  clientProjectSidebarFlowPage: async ({ page }: { page: Page }, use: (r: ClientProjectSidebarFlowPage) => Promise<void>) => {
    await use(new ClientProjectSidebarFlowPage(page, base.info()));
  },
  dashboardDeliverableFlowPage: async ({ page }: { page: Page }, use: (r: DashboardDeliverableFlowPage) => Promise<void>) => {
    await use(new DashboardDeliverableFlowPage(page, base.info()));
  },
  deliverableStageNavigationFlowPage: async (
    { page }: { page: Page },
    use: (r: DeliverableStageNavigationFlowPage) => Promise<void>,
  ) => {
    await use(new DeliverableStageNavigationFlowPage(page, base.info()));
  },
  newDeliverableSettingsFlowPage: async (
    { page }: { page: Page },
    use: (r: NewDeliverableSettingsFlowPage) => Promise<void>,
  ) => {
    await use(new NewDeliverableSettingsFlowPage(page, base.info()));
  },
  improveMyBriefFlowPage: async (
    { page }: { page: Page },
    use: (r: ImproveMyBriefFlowPage) => Promise<void>,
  ) => {
    await use(new ImproveMyBriefFlowPage(page, base.info()));
  },
  deliverableSettingsSourceFlowPage: async (
    { page }: { page: Page },
    use: (r: DeliverableSettingsSourceFlowPage) => Promise<void>,
  ) => {
    await use(new DeliverableSettingsSourceFlowPage(page, base.info()));
  },
  chatAssistantFlowPage: async (
    { page }: { page: Page },
    use: (r: ChatAssistantFlowPage) => Promise<void>,
  ) => {
    await use(new ChatAssistantFlowPage(page, base.info()));
  },
  deliverableExportFlowPage: async (
    { page }: { page: Page },
    use: (r: DeliverableExportFlowPage) => Promise<void>,
  ) => {
    await use(new DeliverableExportFlowPage(page, base.info()));
  },
  deliverableExportLoaderFlowPage: async (
    { page }: { page: Page },
    use: (r: DeliverableExportLoaderFlowPage) => Promise<void>,
  ) => {
    await use(new DeliverableExportLoaderFlowPage(page, base.info()));
  },
  deliverableEditsSyncFlowPage: async (
    { page }: { page: Page },
    use: (r: DeliverableEditsSyncFlowPage) => Promise<void>,
  ) => {
    await use(new DeliverableEditsSyncFlowPage(page, base.info()));
  },
  projectCrudPage: async ({ page }: { page: Page }, use: (r: ProjectCrudPage) => Promise<void>) => {
    await use(new ProjectCrudPage(page, base.info()));
  },
  projectCrudFlowPage: async (
    { page }: { page: Page },
    use: (r: ProjectCrudFlowPage) => Promise<void>,
  ) => {
    await use(new ProjectCrudFlowPage(page, base.info()));
  },
  clientCrudPage: async ({ page }: { page: Page }, use: (r: ClientCrudPage) => Promise<void>) => {
    await use(new ClientCrudPage(page, base.info()));
  },
  clientCrudFlowPage: async (
    { page }: { page: Page },
    use: (r: ClientCrudFlowPage) => Promise<void>,
  ) => {
    await use(new ClientCrudFlowPage(page, base.info()));
  },
  deliverableCrudPage: async ({ page }: { page: Page }, use: (r: DeliverableCrudPage) => Promise<void>) => {
    await use(new DeliverableCrudPage(page, base.info()));
  },
  deliverableCrudFlowPage: async (
    { page }: { page: Page },
    use: (r: DeliverableCrudFlowPage) => Promise<void>,
  ) => {
    await use(new DeliverableCrudFlowPage(page, base.info()));
  },
  deliverableReadUpdatePage: async (
    { page }: { page: Page },
    use: (r: DeliverableReadUpdatePage) => Promise<void>,
  ) => {
    await use(new DeliverableReadUpdatePage(page, base.info()));
  },
  deliverableReadUpdateFlowPage: async (
    { page }: { page: Page },
    use: (r: DeliverableReadUpdateFlowPage) => Promise<void>,
  ) => {
    await use(new DeliverableReadUpdateFlowPage(page, base.info()));
  },
});

export { test as leaderTest };
