import { expect } from '@playwright/test';
import type { ChatAssistantResponseIntent } from '@interface/dashboard/chat-assistant.interface';
import { countMatchedThemes, normalizeBriefText } from '@utilities/helpers/brief-intent.utils';

export function assertChatResponseMentionsRequired(
  response: string,
  terms: string[],
): void {
  const normalized = normalizeBriefText(response);
  for (const term of terms) {
    const needle = term.trim().toLowerCase();
    if (!needle) {
      continue;
    }
    expect(
      normalized.includes(needle),
      `Assistant reply should mention "${term}" in context of the prompt`,
    ).toBe(true);
  }
}

export function assertChatResponseMatchesIntent(
  response: string,
  intent: ChatAssistantResponseIntent,
): void {
  const trimmed = response.trim();
  expect(trimmed.length, 'Assistant reply should not be empty').toBeGreaterThanOrEqual(
    intent.minResponseLength,
  );

  const matched = countMatchedThemes(trimmed, intent.themes);
  expect(
    matched,
    `Expected at least ${intent.minThemesMatched} contextual theme(s) in reply: ${intent.themes.join(', ')}`,
  ).toBeGreaterThanOrEqual(intent.minThemesMatched);
}

export function assertChatResponseIsNotDenied(
  response: string,
  forbiddenPhrases: string[],
): void {
  const normalized = normalizeBriefText(response);
  for (const phrase of forbiddenPhrases) {
    const needle = phrase.trim().toLowerCase();
    if (!needle) {
      continue;
    }
    expect(
      normalized.includes(needle),
      `Assistant should respond in deliverable context, not deny access: "${phrase}"`,
    ).toBe(false);
  }
}

export function assertChatResponseDoesNotLeak(
  response: string,
  leakMarkers: string[],
  userPrompt: string,
): void {
  const normalized = normalizeBriefText(response);
  const promptNorm = normalizeBriefText(userPrompt);

  for (const marker of leakMarkers) {
    const needle = marker.trim().toLowerCase();
    if (!needle) {
      continue;
    }
    if (promptNorm.includes(needle)) {
      continue;
    }
    expect(
      normalized.includes(needle),
      `Assistant reply must not leak unrelated record content: "${marker}"`,
    ).toBe(false);
  }
}
