/**
 * Step pacing for E2E flows.
 * - Default: short pauses (automation-friendly).
 * - Headed / demo: set `E2E_OBSERVE_MS=2000` for visible pauses between steps.
 * - Fastest: `E2E_FAST=1` → no artificial waits.
 */

const parseNonNegativeInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const isFastMode = (): boolean =>
  process.env.E2E_FAST === '1' || process.env.E2E_FAST === 'true';

/** Artificial pause after a step (0 in fast mode). */
export const E2E_STEP_SETTLE_MS = isFastMode()
  ? 0
  : parseNonNegativeInt(process.env.E2E_OBSERVE_MS, 300);

/** Navigation / UI settle after stage change (not generation). */
export const E2E_NAV_SETTLE_MS = isFastMode()
  ? 0
  : parseNonNegativeInt(process.env.E2E_NAV_SETTLE_MS, 400);
