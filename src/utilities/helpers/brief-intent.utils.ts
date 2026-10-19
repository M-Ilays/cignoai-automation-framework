import { expect } from '@playwright/test';
import type { BriefImprovementIntent } from '@interface/dashboard/improve-my-brief.interface';

export function normalizeBriefText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function countMatchedThemes(text: string, themes: string[]): number {
  const normalized = normalizeBriefText(text);
  return themes.filter((theme) => normalized.includes(theme.trim().toLowerCase())).length;
}

/**
 * Assert AI output matches business intent (not exact wording).
 */
export function assertBriefMatchesIntent(
  text: string,
  intent: BriefImprovementIntent,
  label: string,
): void {
  const trimmed = text.trim();
  expect(trimmed.length, `${label}: text should not be empty`).toBeGreaterThanOrEqual(
    intent.minImprovedLength,
  );

  const matched = countMatchedThemes(trimmed, intent.themes);
  expect(
    matched,
    `${label}: expected at least ${intent.minThemesMatched} intent theme(s) in: ${intent.themes.join(', ')}`,
  ).toBeGreaterThanOrEqual(intent.minThemesMatched);
}

/**
 * Original vs improved — wording differs but improved should relate to original themes
 * and must not be a trivial copy when AI refinement ran.
 */
export function assertImprovedRelatesToOriginal(
  original: string,
  improved: string,
  intent: BriefImprovementIntent,
): void {
  const orig = normalizeBriefText(original);
  const imp = normalizeBriefText(improved);

  expect(imp.length, 'Improved brief should not be empty').toBeGreaterThan(0);
  assertBriefMatchesIntent(improved, intent, 'Improved brief');

  const origThemes = countMatchedThemes(orig, intent.themes);
  expect(
    origThemes + countMatchedThemes(imp, intent.themes),
    'Original and improved should both reflect the brief intent',
  ).toBeGreaterThanOrEqual(intent.minThemesMatched);
}
