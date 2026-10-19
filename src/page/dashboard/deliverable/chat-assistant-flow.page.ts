import type { ChatAssistantTestCaseData } from '@interface/dashboard/chat-assistant.interface';
import { ChatAssistantPage } from '@page/dashboard/deliverable/chat-assistant.page';
import { ClientSearchPage } from '@page/dashboard/client/client-search.page';
import { DeliverablePage } from '@page/dashboard/deliverable/deliverable.page';
import { expect, Page, test, TestInfo } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

/**
 * TC-014 — Chat Assistant availability and contextual response.
 * 1. Open Chat Assistant for the new deliverable
 * 2. Ask context-based question about the new brief
 * 3. Verify response relevance (no leak from other records)
 * 4. Close and reopen assistant
 */
export class ChatAssistantFlowPage {
  private readonly page: Page;
  private readonly clientSearchPage: ClientSearchPage;
  private readonly chatAssistantPage: ChatAssistantPage;
  private readonly deliverablePage: DeliverablePage;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.clientSearchPage = new ClientSearchPage(page, testInfo);
    this.chatAssistantPage = new ChatAssistantPage(page, testInfo);
    this.deliverablePage = new DeliverablePage(page, testInfo);
  }

  public async runChatAssistantWorkflow(bundle: ChatAssistantTestCaseData): Promise<void> {
    const scenario = bundle.scenario;
    const deliverableName = scenario.deliverableName.trim();
    const prompt = scenario.userPrompt.trim();

    await test.step('Open application (saved session cookies only)', async () => {
      await gotoAppHomeWithSession(this.page);
    });

    await test.step(`Open "${deliverableName}" for Chat Assistant`, async () => {
      await this.clientSearchPage.openDeliverableFromSidebar(deliverableName, {
        clientLabel: scenario.clientLabel,
        projectLabel: scenario.projectLabel,
        skipStageReadyWait: true,
      });
      await this.clientSearchPage.waitForDeliverableOpenInMainView(deliverableName);
      await this.clientSearchPage.confirmStorylineGenerationLeaveIfPrompted();
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.ensureBriefViewReadyForChat();
    });

    await test.step('1. Open Chat Assistant for the new deliverable', async () => {
      await this.chatAssistantPage.openChatAssistant();
    });

    let assistantReply = '';

    await test.step('2. Ask context-based question about the new brief', async () => {
      await this.chatAssistantPage.sendUserPrompt(prompt);
      assistantReply = await this.chatAssistantPage.waitForAssistantReply(prompt);
    });

    await test.step('3. Verify response relevance', async () => {
      await this.chatAssistantPage.assertReplyIsContextualAndNotLeaking(
        assistantReply,
        prompt,
        scenario.responseIntent,
        scenario.leakMarkers,
        scenario.forbiddenPhrases,
        scenario.requiredMentions,
      );
    });

    await test.step('4. Close and reopen Chat Assistant', async () => {
      await this.deliverablePage.dismissBlockingDeliverablePanels();
      await this.chatAssistantPage.closeChatAssistant();
      await this.chatAssistantPage.assertChatAssistantClosed();
      await this.chatAssistantPage.openChatAssistant();
      await this.chatAssistantPage.assertChatAssistantOpen();
    });
  }

  private async ensureBriefViewReadyForChat(): Promise<void> {
    await this.deliverablePage.prepareDeliverableViewForChatAssistant();

    const chatLaunch = this.page
      .getByRole('button', { name: /^Chat Assistant$/i })
      .or(this.page.getByRole('button', { name: /^Start\s+chat$/i }))
      .last();

    if (await chatLaunch.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await chatLaunch.scrollIntoViewIfNeeded().catch(() => undefined);
      return;
    }

    const tab1 = this.page
      .getByRole('button', { name: /^1$/ })
      .or(this.page.getByRole('button', { name: /1\.\s*Brief/i }))
      .first();
    if (await tab1.isVisible().catch(() => false)) {
      await tab1.click({ force: true });
      await this.page.waitForTimeout(500);
    }

    const myBrief = this.page.getByRole('button', { name: /^My Brief$/i });
    if (await myBrief.isVisible().catch(() => false)) {
      await myBrief.click({ force: true });
      await this.page.waitForTimeout(500);
    }

    await expect(
      this.page
        .getByRole('button', { name: /Improve My Brief/i })
        .or(this.page.getByRole('button', { name: /^My Brief$/i }))
        .or(this.page.getByText(/Approach And Framing|Explain the business context/i))
        .or(this.page.getByRole('heading', { name: /Now Is Time To Deliver/i }))
        .or(this.page.getByPlaceholder(/Type something here|deliverable you need/i))
        .or(chatLaunch)
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  }
}
