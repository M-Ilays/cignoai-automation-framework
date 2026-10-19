/**
 * TC-008 timing — generation after **Generate Deliverable** averages ~10–18 min on staging.
 * Override via env: `DELIVERABLE_GENERATION_TIMEOUT_MS`, `TC008_TEST_TIMEOUT_MS`.
 */

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Standard project cards hydrate ~2–3s after **Build a Deliverable** (MCP staging). */
export const STANDARD_PROJECT_CARDS_SETTLE_MS = 3_000;

/** Deliverable mode after **Add This Agent** (modal close + structure render). */
export const DELIVERABLE_MODE_AFTER_ADD_AGENT_TIMEOUT_MS = 60_000;

/** Settings sheet after deliverable-mode send (API + render can be slow). */
export const DELIVERABLE_SETTINGS_SHEET_TIMEOUT_MS = 120_000;

/** Wait for Progress / spinner to appear after Generate (fail fast if generation never starts). */
export const DELIVERABLE_GENERATION_STARTED_TIMEOUT_MS = 3 * 60 * 1000;

/** Wait for Progress step to complete (covers ~18–25 min p95 with buffer). */
export const DELIVERABLE_GENERATION_PROGRESS_TIMEOUT_MS = parsePositiveInt(
  process.env.DELIVERABLE_GENERATION_TIMEOUT_MS,
  35 * 60 * 1000,
);

/** Whole test: earlier steps (~8–12 min) + generation (up to 35 min). */
export const TC008_TEST_TIMEOUT_MS = parsePositiveInt(process.env.TC008_TEST_TIMEOUT_MS, 50 * 60 * 1000);
