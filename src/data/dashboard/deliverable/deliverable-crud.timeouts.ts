/**
 * TC-019 — dashboard create (TC-008) + generation (~10–18 min) + tree CRUD.
 * Override: `TC019_TEST_TIMEOUT_MS`, `DELIVERABLE_GENERATION_TIMEOUT_MS`.
 */

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Whole test: TC-008-style create/generate (~50 min) + CRUD steps (~5 min buffer). */
export const TC019_TEST_TIMEOUT_MS = parsePositiveInt(process.env.TC019_TEST_TIMEOUT_MS, 55 * 60 * 1000);
