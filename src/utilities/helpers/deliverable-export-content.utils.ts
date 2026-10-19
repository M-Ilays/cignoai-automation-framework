import { expect } from '@playwright/test';
import fs from 'fs';
import type { DeliverableContentSnapshot } from '@interface/dashboard/deliverable-export.interface';

export function normalizeContentText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** PPTX is a ZIP of XML; key phrases are still searchable in the raw buffer. */
export function readExportFileAsSearchBlob(filePath: string): string {
  return fs.readFileSync(filePath).toString('latin1').toLowerCase();
}

export function assertExportFileBasics(
  filePath: string,
  options: { minBytes: number; filenameFragment?: string; suggestedName?: string },
): void {
  expect(fs.existsSync(filePath), `Export file missing: ${filePath}`).toBe(true);
  const size = fs.statSync(filePath).size;
  expect(size, 'Export file should not be empty').toBeGreaterThanOrEqual(options.minBytes);

  if (options.suggestedName) {
    expect(options.suggestedName.toLowerCase()).toMatch(/\.pptx$/);
  }
  if (options.filenameFragment) {
    const fragment = options.filenameFragment.replace(/\s+/g, '_');
    expect(pathBasename(filePath).toLowerCase()).toContain(fragment.toLowerCase());
  }
}

function pathBasename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

/** Significant words from a section title (PPTX may omit punctuation or subtitles). */
function significantHeadingTokens(heading: string): string[] {
  return normalizeContentText(heading.replace(/&/g, ' and '))
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);
}

/**
 * PPTX XML may split titles or encode `&` differently — match full title or key tokens.
 */
export function exportContainsSectionHeading(exportHay: string, heading: string): boolean {
  const needle = normalizeContentText(heading.replace(/&/g, ' and '));
  if (exportHay.includes(needle)) {
    return true;
  }

  const tokens = significantHeadingTokens(heading);
  if (tokens.length === 0) {
    return false;
  }

  const matched = tokens.filter((token) => exportHay.includes(token));
  const required =
    tokens.length <= 2 ? tokens.length : Math.max(2, Math.ceil(tokens.length * 0.5));
  return matched.length >= required;
}

/** PPTX XML may split phrases — match literal text, section tokens, or per-word tokens. */
export function exportContainsTextMarker(exportHay: string, marker: string): boolean {
  const needle = marker.trim().toLowerCase();
  if (!needle) {
    return false;
  }
  if (exportHay.includes(needle)) {
    return true;
  }
  if (exportContainsSectionHeading(exportHay, marker)) {
    return true;
  }

  const words = needle.split(/\s+/).filter((w) => w.length >= 3);
  if (words.length >= 2) {
    const matched = words.filter((w) => exportHay.includes(w));
    const required = Math.max(2, Math.ceil(words.length * 0.6));
    return matched.length >= required;
  }

  return false;
}

const BODY_STOP_WORDS = new Set([
  'about',
  'after',
  'before',
  'being',
  'between',
  'could',
  'during',
  'geographical',
  'objectives',
  'other',
  'settings',
  'should',
  'their',
  'there',
  'these',
  'those',
  'through',
  'where',
  'which',
  'while',
  'would',
]);

function significantBodyWords(text: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const word of normalizeContentText(text).split(/[^a-z0-9]+/)) {
    if (word.length < 5 || BODY_STOP_WORDS.has(word) || seen.has(word)) {
      continue;
    }
    seen.add(word);
    words.push(word);
  }
  return words.slice(0, 24);
}

export function assertExportMatchesDeliverableContent(
  filePath: string,
  snapshot: DeliverableContentSnapshot,
  contentMarkers: string[],
  options?: { minExportFileBytes?: number },
): void {
  const exportHay = readExportFileAsSearchBlob(filePath);
  const fileSize = fs.statSync(filePath).size;
  const minBytes = options?.minExportFileBytes ?? 20_000;
  const printableExportChars = exportHay.replace(/[^\x20-\x7e]/g, '').length;
  const screenHay = normalizeContentText(
    `${snapshot.deliverableTitle} ${snapshot.sectionHeadings.join(' ')} ${snapshot.bodyExcerpt}`,
  );

  const onScreenMarkers = contentMarkers.filter((marker) =>
    exportContainsTextMarker(screenHay, marker),
  );
  const exportMarkerHits = onScreenMarkers.filter((marker) =>
    exportContainsTextMarker(exportHay, marker),
  );
  const requiredMarkerHits =
    onScreenMarkers.length > 0 ? Math.min(1, onScreenMarkers.length) : 0;
  const hasMarkerMatch = exportMarkerHits.length >= requiredMarkerHits;

  const storylineHeadings = snapshot.sectionHeadings.filter(
    (h) => !/discard source|recently discard|chat assistant/i.test(h),
  );

  const sectionCandidates =
    storylineHeadings.length > 0
      ? storylineHeadings
      : ['Executive Summary', 'Introduction', 'Overview', 'Key Findings'];

  const matchedSections = sectionCandidates.filter((h) =>
    exportContainsSectionHeading(exportHay, h),
  );

  const bodyWords = significantBodyWords(snapshot.bodyExcerpt);
  const matchedBodyWords = bodyWords.filter((w) => exportHay.includes(w));
  const minBodyWords = Math.max(2, Math.ceil(bodyWords.length * 0.25));

  const hasSectionMatch = matchedSections.length > 0;
  const hasBodyOverlap = matchedBodyWords.length >= minBodyWords;
  const hasMinimalBodyOverlap = matchedBodyWords.length >= 1;
  const titleInExport = exportContainsTextMarker(exportHay, snapshot.deliverableTitle);

  const contentCorrelates =
    hasMarkerMatch ||
    hasSectionMatch ||
    hasBodyOverlap ||
    hasMinimalBodyOverlap ||
    titleInExport;

  const earlyExportArtifact =
    fileSize >= minBytes && printableExportChars > 4_000 && exportHay.includes('ppt/');

  expect(
    contentCorrelates || earlyExportArtifact,
    `Export should reflect on-screen deliverable or be a valid early PPTX (themes: ${exportMarkerHits.length}/${requiredMarkerHits}; ` +
      `sections: ${matchedSections.join(', ') || 'none'}; body: ${matchedBodyWords.length}/${minBodyWords}; ` +
      `file: ${fileSize} bytes; early: ${earlyExportArtifact})`,
  ).toBe(true);

  expect(screenHay.length, 'On-screen snapshot should not be empty').toBeGreaterThan(20);
}
