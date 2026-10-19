const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** TC-016 full flow. */
export const TC016_TEST_TIMEOUT_MS = parsePositiveInt(
  process.env.TC016_TEST_TIMEOUT_MS,
  30 * 60 * 1000,
);

export const TC016_EXPORT_RESOLVE_TIMEOUT_MS = parsePositiveInt(
  process.env.TC016_EXPORT_RESOLVE_TIMEOUT_MS,
  5 * 60 * 1000,
);

export const TC016_STEP_SETTLE_MS = Number(process.env.TC016_STEP_SETTLE_MS) || 2_000;
