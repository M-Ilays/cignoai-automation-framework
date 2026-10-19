import { E2E_STEP_SETTLE_MS } from '@data/dashboard/deliverable/e2e-pacing.timeouts';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** TC-018 — open, read, update Settings fields, reopen, isolation. */
export const TC018_TEST_TIMEOUT_MS = parsePositiveInt(
  process.env.TC018_TEST_TIMEOUT_MS,
  8 * 60 * 1000,
);

export const TC018_STEP_SETTLE_MS =
  process.env.TC018_STEP_SETTLE_MS !== undefined ?
    Number(process.env.TC018_STEP_SETTLE_MS)
  : E2E_STEP_SETTLE_MS;

export const TC018_MARKER_POLL_MS = parsePositiveInt(
  process.env.TC018_MARKER_POLL_MS,
  90_000,
);
