import {
  TC013_GENERATE_DELIVERABLE_WAIT_MS,
  TC013_STEP_SETTLE_MS,
} from '@data/dashboard/deliverable/deliverable-settings-source.timeouts';
import type { DeliverableSettingsSourceTestCaseData } from '@interface/dashboard/deliverable-settings-source.interface';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { DeliverableSourceUploadPage } from '@page/dashboard/deliverable/deliverable-source-upload.page';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/** TC-013 — Settings source upload, processing, and per-deliverable isolation. */
export class DeliverableSettingsSourceFlowPage {
  private readonly page: Page;
  private readonly clientSearchPage: ClientSearchPage;
  private readonly deliverablePage: DeliverablePage;
  private readonly sourceUploadPage: DeliverableSourceUploadPage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
    this.deliverablePage = new DeliverablePage(page, testInfo);
    this.sourceUploadPage = new DeliverableSourceUploadPage(page, testInfo);
  }

  public async runSettingsSourceUploadWorkflow(
    bundle: DeliverableSettingsSourceTestCaseData,
  ): Promise<void> {
    const scenario = bundle.scenario;
    const targetName = scenario.targetDeliverableName.trim();
    const isolationName = scenario.isolationDeliverableName.trim();
    const { fileName: resolvedName } = this.sourceUploadPage.resolveDocumentPath(
      scenario.documentPath,
    );
    const fileName = scenario.expectedFileName?.trim() || resolvedName;
    const settle = scenario.stepSettleMs ?? TC013_STEP_SETTLE_MS;

    const stepPause = async (label: string): Promise<void> => {
      await test.step(`Wait ${settle / 1000}s: ${label}`, async () => {
        await this.page.waitForTimeout(settle);
      });
    };

    await test.step('Open application (saved session cookies only)', async () => {
      await gotoAppHomeWithSession(this.page);
      if (settle > 0) {
        await this.page.waitForTimeout(settle);
      }
    });

    await test.step(`Open "${targetName}" and go to Settings`, async () => {
      await this.clientSearchPage.openDeliverableFromSidebar(targetName, {
        clientLabel: scenario.clientLabel,
        projectLabel: scenario.projectLabel,
      });
      await this.sourceUploadPage.ensureSettingsStageReadyForUpload();
      await stepPause('Settings ready for upload');
    });

    await this.sourceUploadPage.attachSourceAtSettings(scenario.documentPath, { settleMs: settle });
    await this.sourceUploadPage.assertSourceAttachedToDeliverable(fileName);
    await stepPause('Source attached');

    await this.deliverablePage.ensureProjectNameFilled(scenario.projectName);
    await stepPause('Project Name ready');
    await this.deliverablePage.clickGenerateDeliverable(settle);
    await test.step(`Wait ${TC013_GENERATE_DELIVERABLE_WAIT_MS / 1000}s after Generate deliverable`, async () => {
      await this.page.waitForTimeout(TC013_GENERATE_DELIVERABLE_WAIT_MS);
    });

    await test.step(`Open "${isolationName}"`, async () => {
      await stepPause('Before isolation deliverable');
      await this.clientSearchPage.openDeliverableFromSidebar(isolationName, {
        clientLabel: scenario.isolationClientLabel,
        projectLabel: scenario.isolationProjectLabel,
        confirmStorylineLeave: true,
        skipStageReadyWait: true,
        waitUntilLeftDeliverable: targetName,
      });
      await stepPause('Isolation deliverable opened');
    });

    await test.step(`Open Settings on "${isolationName}"`, async () => {
      await this.sourceUploadPage.openSettingsStage();
      await stepPause('Settings open on isolation deliverable');
    });

    await test.step(
      `Verify "${fileName}" from "${targetName}" does not appear on "${isolationName}"`,
      async () => {
        await this.clientSearchPage.waitForDeliverableOpenInMainView(isolationName);
        await this.sourceUploadPage.assertUploadedFileNotOnDeliverableSettings(fileName, {
          sourceDeliverableName: targetName,
          isolationDeliverableName: isolationName,
        });
      },
    );
  }
}
