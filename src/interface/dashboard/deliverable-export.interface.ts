import type { TestCaseData } from '../base/testcase.interface';

export interface DeliverableExportScenario {
  deliverableName: string;
  clientLabel?: string;
  projectLabel?: string;
  /** Substrings expected in both on-screen deliverable and exported PPTX. */
  contentMarkers: string[];
  /** Minimum exported file size (bytes). */
  minExportFileBytes?: number;
  /** Optional substring expected in downloaded filename. */
  expectedFilenameFragment?: string;
  stepSettleMs?: number;
  /** When Export is already enabled, skip Settings → Generate (sample deliverable). */
  skipGenerateWhenExportReady?: boolean;
  /** Tried in order when primary {@link deliverableName} is missing from the sidebar. */
  fallbackDeliverableNames?: string[];
}

export interface DeliverableContentSnapshot {
  deliverableTitle: string;
  sectionHeadings: string[];
  bodyExcerpt: string;
}

/** Opened/read PPTX after export download (TC-015 step 3). */
export interface ExportedOutputSummary {
  filePath: string;
  suggestedFilename: string;
  fileSizeBytes: number;
  isValidPptxZip: boolean;
  readableExcerpt: string;
}

export interface DeliverableExportTestCaseData {
  scenario: DeliverableExportScenario;
  testCaseData: TestCaseData;
}
