import {
  CHAT_ASSISTANT_LAUNCH_TIMEOUT_MS,
  CHAT_ASSISTANT_REPLY_TIMEOUT_MS,
  CHAT_PROMPT_OBSERVE_MS,
  CHAT_PROMPT_TYPING_DELAY_MS,
  CHAT_REPLY_MIN_LENGTH,
  CHAT_REPLY_OBSERVE_MS,
  CHAT_REPLY_STABLE_MS,
} from '@data/dashboard/deliverable/chat-assistant.timeouts';
import type { ChatAssistantResponseIntent } from '@interface/dashboard/chat-assistant.interface';
import { expect, Locator, Page, test, TestInfo } from '@playwright/test';
import {
  assertChatResponseDoesNotLeak,
  assertChatResponseIsNotDenied,
  assertChatResponseMatchesIntent,
  assertChatResponseMentionsRequired,
} from '@utilities/helpers/chat-assistant-intent.utils';

/**
 * TC-014 — Chat Assistant on an open deliverable (toggle, prompt, reply, close/reopen).
 */
export class ChatAssistantPage {
  private readonly page: Page;
  private readonly testInfo: TestInfo;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
  }

  /** Centered footer control (not the copy inside the Source side drawer). */
  private chatAssistantLaunchButton(): Locator {
    return this.page
      .getByRole('button', { name: /^Chat Assistant$/i })
      .or(this.page.getByRole('button', { name: /^Start\s+chat$/i }))
      .last();
  }

  private collapseChatButton(): Locator {
    return this.page.getByRole('button', { name: /^Collapse chat$/i });
  }

  private chatAssistantHeading(): Locator {
    return this.page.getByRole('heading', { name: /^Chat Assistant$/i }).first();
  }

  private chatPanelRoot(): Locator {
    return this.chatAssistantHeading().locator(
      'xpath=ancestor::*[.//textarea or .//*[@role="textbox"]][1]',
    );
  }

  private chatInput(): Locator {
    return this.chatPanelRoot()
      .getByRole('textbox', { name: /Type something here/i })
      .or(this.chatPanelRoot().locator('textarea:visible'))
      .first();
  }

  private chatSendButton(): Locator {
    return this.chatPanelRoot().getByRole('button', { name: /^Send$/i });
  }

  /** Staging UI disables the chat textarea while the assistant is generating. */
  private async isChatInputReady(): Promise<boolean> {
    const input = this.chatInput();
    if (!(await input.isVisible().catch(() => false))) {
      return false;
    }
    return await input.isEnabled().catch(() => false);
  }

  private async hasChatSpinner(): Promise<boolean> {
    return await this.chatPanelRoot()
      .locator('[aria-busy="true"], [class*="animate-spin"]')
      .first()
      .isVisible()
      .catch(() => false);
  }

  private async isChatPanelOpen(): Promise<boolean> {
    return await this.chatInput().isVisible({ timeout: 400 }).catch(() => false);
  }

  private isRoutingOrDebugLine(line: string): boolean {
    return /route selected|research process|input \d|condition \d|cigno chat assistant \d|finding the right consulting/i.test(
      line,
    );
  }

  private normalizeReplyText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /** All assistant paragraphs after the latest user prompt (full answer, not first chunk). */
  private async captureFullAssistantReply(userPrompt: string): Promise<string> {
    const promptNorm = this.normalizeReplyText(userPrompt).toLowerCase();
    const paragraphs = this.chatPanelRoot().locator('p');
    const count = await paragraphs.count();
    const afterPrompt: string[] = [];
    let seenLatestUserPrompt = false;

    for (let i = 0; i < count; i += 1) {
      const text = this.normalizeReplyText(await paragraphs.nth(i).innerText());
      if (!text) {
        continue;
      }
      if (text.toLowerCase() === promptNorm || text.toLowerCase().includes(promptNorm)) {
        seenLatestUserPrompt = true;
        afterPrompt.length = 0;
        continue;
      }
      if (this.isRoutingOrDebugLine(text)) {
        continue;
      }
      if (seenLatestUserPrompt) {
        afterPrompt.push(text);
      }
    }

    if (afterPrompt.length > 0) {
      return afterPrompt.join(' ').trim();
    }

    for (let i = count - 1; i >= 0; i -= 1) {
      const text = this.normalizeReplyText(await paragraphs.nth(i).innerText());
      if (!text || text.toLowerCase() === promptNorm) {
        continue;
      }
      if (this.isRoutingOrDebugLine(text)) {
        continue;
      }
      return text;
    }

    return '';
  }

  private async isChatGenerating(): Promise<boolean> {
    if (await this.hasChatSpinner()) {
      return true;
    }
    return !(await this.isChatInputReady());
  }

  public async openChatAssistant(): Promise<void> {
    await test.step('Open Chat Assistant', async () => {
      if (await this.isChatPanelOpen()) {
        await expect(this.chatInput()).toBeEnabled({ timeout: 10_000 });
        return;
      }

      const launch = this.chatAssistantLaunchButton();
      await launch.waitFor({ state: 'visible', timeout: CHAT_ASSISTANT_LAUNCH_TIMEOUT_MS });
      await launch.scrollIntoViewIfNeeded();
      await launch.click({ timeout: 8_000 });

      await expect(this.chatAssistantHeading()).toBeVisible({ timeout: 10_000 });
      await expect(this.chatInput()).toBeEnabled({ timeout: 15_000 });
    });
  }

  public async assertChatAssistantOpen(): Promise<void> {
    await test.step('Assert Chat Assistant is open', async () => {
      await expect(this.chatAssistantHeading()).toBeVisible({ timeout: 15_000 });
      await expect(this.chatInput()).toBeVisible({ timeout: 15_000 });
    });
  }

  public async closeChatAssistant(): Promise<void> {
    await test.step('Close Chat Assistant', async () => {
      if (!(await this.isChatPanelOpen())) {
        return;
      }

      await expect(this.collapseChatButton()).toBeVisible({ timeout: 10_000 });
      await this.collapseChatButton().click();
      await expect(this.chatInput()).not.toBeVisible({ timeout: 10_000 });
    });
  }

  public async assertChatAssistantClosed(): Promise<void> {
    await test.step('Assert Chat Assistant is closed', async () => {
      await expect(this.chatInput()).not.toBeVisible({ timeout: 10_000 });
      await expect(this.chatAssistantLaunchButton()).toBeVisible({ timeout: 10_000 });
    });
  }

  private async readChatInputText(input: Locator): Promise<string> {
    const value = await input.inputValue().catch(() => '');
    if (value.trim()) {
      return value;
    }
    return (await input.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }

  public async sendUserPrompt(prompt: string): Promise<void> {
    const promptText = prompt.trim();
    await test.step(`Send chat prompt (${promptText.length} chars)`, async () => {
      this.testInfo.annotations.push({
        type: 'Chat prompt',
        description: promptText,
      });

      await this.testInfo.attach('chat-user-prompt.txt', {
        body: promptText,
        contentType: 'text/plain',
      });

      const input = this.chatInput();
      await expect(input).toBeVisible({ timeout: 15_000 });
      await expect(input).toBeEnabled({ timeout: 30_000 });
      await input.click();

      if (CHAT_PROMPT_TYPING_DELAY_MS > 0) {
        await input.fill('');
        await input.pressSequentially(promptText, { delay: CHAT_PROMPT_TYPING_DELAY_MS });
      } else {
        await input.fill(promptText);
      }

      await expect
        .poll(async () => this.readChatInputText(input), { timeout: 5_000 })
        .toContain(promptText);

      await this.testInfo.attach('chat-prompt-in-input.txt', {
        body: await this.readChatInputText(input),
        contentType: 'text/plain',
      });

      await this.testInfo.attach('chat-prompt-before-send.png', {
        body: await this.page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      });

      if (CHAT_PROMPT_OBSERVE_MS > 0) {
        await test.step(`Show prompt in chat input (${CHAT_PROMPT_OBSERVE_MS / 1000}s)`, async () => {
          await this.page.waitForTimeout(CHAT_PROMPT_OBSERVE_MS);
        });
      }

      const send = this.chatSendButton();
      await expect(send).toBeEnabled({ timeout: 15_000 });
      await send.click();

      await expect(this.chatPanelRoot().getByText(promptText).first()).toBeVisible({
        timeout: 15_000,
      });

      await expect
        .poll(
          async () => {
            if (await this.isChatGenerating()) {
              return true;
            }
            const draft = await this.captureFullAssistantReply(promptText);
            return draft.length >= CHAT_REPLY_MIN_LENGTH;
          },
          { timeout: 25_000, intervals: [300, 500, 800, 1000] },
        )
        .toBe(true);
    });
  }

  public async waitForAssistantReply(
    userPrompt: string,
    timeoutMs = CHAT_ASSISTANT_REPLY_TIMEOUT_MS,
  ): Promise<string> {
    return await test.step('Wait for Chat Assistant to finish answering', async () => {
      let reply = '';
      let lastStableText = '';
      let stableSince = 0;

      await expect
        .poll(
          async () => {
            const generating = await this.isChatGenerating();
            const current = await this.captureFullAssistantReply(userPrompt);

            if (current.length >= CHAT_REPLY_MIN_LENGTH) {
              reply = current;
            }

            if (current.length < CHAT_REPLY_MIN_LENGTH) {
              return generating ? 'generating' : 'pending';
            }

            if (generating) {
              lastStableText = '';
              stableSince = 0;
              return 'generating';
            }

            const now = Date.now();
            if (current !== lastStableText) {
              lastStableText = current;
              stableSince = now;
              reply = current;
              return 'streaming';
            }

            if (stableSince === 0) {
              stableSince = now;
              lastStableText = current;
              reply = current;
            }

            if (now - stableSince >= CHAT_REPLY_STABLE_MS) {
              return 'done';
            }

            return 'streaming';
          },
          {
            timeout: timeoutMs,
            intervals: [500, 500, 1000, 1000, 2000, 3000],
            message:
              'Chat Assistant did not finish (reply still streaming, or never reached stable full answer)',
          },
        )
        .toBe('done');

      if (CHAT_REPLY_OBSERVE_MS > 0) {
        await test.step(`Show completed reply (${CHAT_REPLY_OBSERVE_MS / 1000}s)`, async () => {
          await this.page.waitForTimeout(CHAT_REPLY_OBSERVE_MS);
        });
      }

      await this.testInfo.attach('chat-assistant-reply.txt', {
        body: reply,
        contentType: 'text/plain',
      });

      await this.testInfo.attach('chat-assistant-reply.json', {
        body: JSON.stringify({ userPrompt, reply }, null, 2),
        contentType: 'application/json',
      });

      await this.testInfo.attach('chat-assistant-reply.png', {
        body: await this.page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      });

      return reply;
    });
  }

  public async assertReplyIsContextualAndNotLeaking(
    reply: string,
    userPrompt: string,
    intent: ChatAssistantResponseIntent,
    leakMarkers: string[],
    forbiddenPhrases: string[],
    requiredMentions?: string[],
  ): Promise<void> {
    await test.step('Verify assistant reply is contextual and does not leak', async () => {
      assertChatResponseIsNotDenied(reply, forbiddenPhrases);
      if (requiredMentions?.length) {
        assertChatResponseMentionsRequired(reply, requiredMentions);
      }
      assertChatResponseMatchesIntent(reply, intent);
      assertChatResponseDoesNotLeak(reply, leakMarkers, userPrompt);
    });
  }
}
