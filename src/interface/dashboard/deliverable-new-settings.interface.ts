import type { TestCaseData } from '../base/testcase.interface';

/** TC-010 — open **existing** deliverable → **Settings** → fill form → Generate. */
export interface DeliverableNewSettingsScenario {
  /** Existing deliverable label in sidebar (e.g. **New deliverable**). */
  existingDeliverableName: string;
  /** Optional — narrow sidebar search / tree. */
  clientLabel?: string;
  projectLabel?: string;
  deliverableType: string;
  projectType: string;
  deliverableLanguage: string;
  /** Project objectives and context (Goals). */
  projectObjectives: string;
  timeHorizon: string;
  geographicalScope: string;
  businessScope: string;
  /** All tags to add under Geographical Scope (+ Add). Defaults to [geographicalScope]. */
  geographicalScopeTags?: string[];
  /** All tags to add under Business Scope (+ Add). Defaults to [businessScope]. */
  businessScopeTags?: string[];
  modeConsideration?: string;
  documentPath: string;
  clientSearchTerm: string;
  projectName: string;
  deliverableName: string;
  /** Pause between steps in headed runs (default 2s). */
  stepSettleMs?: number;
}

export interface DeliverableNewSettingsTestCaseData {
  scenario: DeliverableNewSettingsScenario;
  testCaseData: TestCaseData;
}
