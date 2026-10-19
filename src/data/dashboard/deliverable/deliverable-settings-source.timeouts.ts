const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Wait for source upload / processing to finish on Settings. */
export const SOURCE_UPLOAD_PROCESSING_TIMEOUT_MS = parsePositiveInt(
  process.env.SOURCE_UPLOAD_PROCESSING_TIMEOUT_MS,
  2 * 60 * 1000,
);

/** TC-013 full flow (open deliverables + upload + generate + isolation). */
export const TC013_TEST_TIMEOUT_MS = parsePositiveInt(process.env.TC013_TEST_TIMEOUT_MS, 5 * 60 * 1000);

/** Pause between TC-013 steps (override: `TC013_STEP_SETTLE_MS`). */
export const TC013_STEP_SETTLE_MS = Number(process.env.TC013_STEP_SETTLE_MS) || 2_000;

/** Wait after **Generate deliverable** click (override: `TC013_GENERATE_DELIVERABLE_WAIT_MS`). */
export const TC013_GENERATE_DELIVERABLE_WAIT_MS = parsePositiveInt(
  process.env.TC013_GENERATE_DELIVERABLE_WAIT_MS,
  5_000,
);
