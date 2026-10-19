import type { ImproveMyBriefTestCaseData } from '@interface/dashboard/improve-my-brief.interface';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { ImproveMyBriefPage } from '@page/dashboard/deliverable/improve-my-brief.page';
import { Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/** TC-012 — Improve My Brief on existing deliverable (see Jam recording). */
export class ImproveMyBriefFlowPage {
  private readonly page: Page;
  private readonly clientSearchPage: ClientSearchPage;
  private readonly improveMyBriefPage: ImproveMyBriefPage;
  private readonly deliverablePage: DeliverablePage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
    this.improveMyBriefPage = new ImproveMyBriefPage(page, testInfo);
    this.deliverablePage = new DeliverablePage(page, testInfo);
  }

  public async runImproveMyBriefWorkflow(bundle: ImproveMyBriefTestCaseData): Promise<void> {
    const scenario = bundle.scenario;
    const deliverableName = scenario.existingDeliverableName.trim();
    const settle = scenario.stepSettleMs ?? 0;

    await test.step('Open application (saved session cookies only)', async () => {
      await gotoAppHomeWithSession(this.page);
      if (settle > 0) {
        await this.page.waitForTimeout(settle);
      }
    });

    await test.step(`Open "${deliverableName}" from sidebar`, async () => {
      await this.clientSearchPage.openDeliverableFromSidebar(deliverableName, {
        clientLabel: scenario.clientLabel,
        projectLabel: scenario.projectLabel,
      });
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.improveMyBriefPage.waitForBriefStageIdle();
    });

    await this.improveMyBriefPage.clickMyBrief();
    await this.improveMyBriefPage.ensureBriefSeedText(scenario.seedBriefText);
    const originalBeforeImprove = await this.improveMyBriefPage.captureBriefTextareaValue();

    const refinementMode = await this.improveMyBriefPage.clickImproveMyBriefAndWaitForRefinedOutput(
      originalBeforeImprove,
      { maxAttempts: scenario.maxImproveAttempts ?? 3 },
    );

    const comparison = await this.improveMyBriefPage.assertOriginalAndImprovedIntent(
      originalBeforeImprove,
      scenario.intent,
    );

    let appliedViaGenerateBrief = false;
    if (refinementMode === 'comparison') {
      appliedViaGenerateBrief = await this.improveMyBriefPage.clickGenerateBriefIfPresent();
    }

    if (!appliedViaGenerateBrief) {
      await this.improveMyBriefPage.clickBriefSubmit();
      await this.improveMyBriefPage.waitForGeneratingNewBriefBeforeSettingsComplete();
    }

    await this.improveMyBriefPage.assertCanContinueWithRefinedBrief(scenario.intent, comparison);
  }
}
