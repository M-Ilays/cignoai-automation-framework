/** TC-017 — workplan tabs with Sticky notes + **Update section** per module. */
export interface WorkplanSectionDefinition {
  /** Stable key for attachments and logs. */
  key: string;
  /** Visible tab label in the Deliverable workplan row. */
  tabName: string;
  /** Fallback when UI truncates labels (e.g. "Use Case" variants). */
  tabPattern: RegExp;
  /** Unique token asserted in section output after Update section. */
  editToken: string;
}

/** TC-017 scope — Executive Summary only (other workplan tabs are out of scope). */
export const TC017_EXECUTIVE_SUMMARY_ONLY: WorkplanSectionDefinition[] = [
  {
    key: 'executive-summary',
    tabName: 'Executive Summary',
    tabPattern: /Executive Summary/i,
    editToken: 'TC017-ExecutiveSummary',
  },
];

/** All workplan tabs — reference only; TC-017 uses {@link TC017_EXECUTIVE_SUMMARY_ONLY}. */
export const TC017_WORKPLAN_SECTIONS: WorkplanSectionDefinition[] = [
  ...TC017_EXECUTIVE_SUMMARY_ONLY,
  {
    key: 'competition',
    tabName: 'Competition',
    tabPattern: /Competition/i,
    editToken: 'TC017-Competition',
  },
  {
    key: 'use-case-prioritization',
    tabName: 'Use Case Prioritization',
    tabPattern: /Use Case Prioritization/i,
    editToken: 'TC017-UseCasePrioritization',
  },
  {
    key: 'use-case-deep-dive',
    tabName: 'Use Case Deep Dive',
    tabPattern: /Use Case Deep Dive/i,
    editToken: 'TC017-UseCaseDeepDive',
  },
  {
    key: 'key-initiatives',
    tabName: 'Key Initiatives',
    tabPattern: /Key Initiatives/i,
    editToken: 'TC017-KeyInitiatives',
  },
];
