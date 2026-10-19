import type { WorkplanSectionDefinition } from '@data/dashboard/deliverable/deliverable-edits-sync.workplan-sections';
import type { TestCaseData } from '../base/testcase.interface';

export interface WorkplanSectionEditResult {
  sectionKey: string;
  tabName: string;
  editToken: string;
  beforeOutputExcerpt: string;
  afterOutputExcerpt: string;
  stickyNotesCapture: string;
  updateSucceeded: boolean;
  skipped?: boolean;
  skipReason?: string;
}

export interface DeliverableEditsSyncScenario {
  deliverableName: string;
  clientLabel?: string;
  projectLabel?: string;
  /** Unique substring asserted across Brief, Settings, and Deliverable views. */
  syncMarker: string;
  /**
   * Sticky-notes body on **3. Deliverable** (Content tab). Typing enables **Update section**.
   * `deliverableOutputEditSuffix` is appended when set.
   */
  deliverableOutputStickyNoteBase?: string;
  /** Asserted in sticky notes / storyline after **Update section** (e.g. ` — TC-017 output edit`). */
  deliverableOutputEditSuffix?: string;
  stepSettleMs?: number;
  /** Max wait for regeneration after Reset and Regenerate (default 20 min). */
  regenerateTimeoutMs?: number;
  /** Workplan modules to edit via Sticky notes (default: Executive Summary only). */
  workplanSections?: WorkplanSectionDefinition[];
  /** Max wait per section after **Update section** (default 10 min). */
  sectionUpdateTimeoutMs?: number;
  /** Skip Reset/Regenerate when Export + Sticky notes are already ready (default true). */
  skipRegenerateWhenExportReady?: boolean;
  /** Minimum workplan sections that must complete Update section (default 1). */
  minWorkplanSectionsEdited?: number;
  /** Soft wait for section body before edit (default 45s; does not block 5 min). */
  sectionContentWaitMs?: number;
  /** After last **Update section** — not the full regen timeout (default 30 min). */
  postUpdateGenerationTimeoutMs?: number;
  /**
   * When true, step 2 ends after Executive Summary section output is validated (before/after);
   * do not wait for full-deliverable regeneration before returning to prior views.
   */
  skipPostUpdateFullGenerationWait?: boolean;
  /** When true, run Reset/Regenerate after Settings so section Update section works (sample deliverable). */
  regenerateAfterSettings?: boolean;
  regenerateAfterSettingsTimeoutMs?: number;
}

export interface DeliverableEditsSyncTestCaseData {
  scenario: DeliverableEditsSyncScenario;
  testCaseData: TestCaseData;
}
