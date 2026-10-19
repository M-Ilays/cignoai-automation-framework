/** TC-009 — full test (navigation only, no generation wait). */
export const TC009_TEST_TIMEOUT_MS = 180_000;

/** Each Brief ↔ Settings transition should render within this budget on staging. */
export const DELIVERABLE_STAGE_LOAD_TIMEOUT_MS = 8_000;

/** Fixed pause after each stage panel is ready (observe UI / state retention). */
export const DELIVERABLE_STAGE_NAVIGATION_SETTLE_MS = 5_000;
