import { E2E_STEP_SETTLE_MS } from '@data/dashboard/deliverable/e2e-pacing.timeouts';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const isFastMode = (): boolean =>
  process.env.E2E_FAST === '1' || process.env.E2E_FAST === 'true';

/** TC-014 — includes waiting for full Chat Assistant reply. */
export const TC014_TEST_TIMEOUT_MS = parsePositiveInt(
  process.env.TC014_TEST_TIMEOUT_MS,
  10 * 60 * 1000,
);

/** Wait for Chat Assistant / Start chat launch control before click. */
export const CHAT_ASSISTANT_LAUNCH_TIMEOUT_MS = parsePositiveInt(
  process.env.CHAT_ASSISTANT_LAUNCH_TIMEOUT_MS,
  12_000,
);

/** Wait for Chat Assistant reply after send. */
export const CHAT_ASSISTANT_REPLY_TIMEOUT_MS = parsePositiveInt(
  process.env.CHAT_ASSISTANT_REPLY_TIMEOUT_MS,
  180_000,
);

/** Reply text must be unchanged this long (ms) with input enabled and no spinner. */
export const CHAT_REPLY_STABLE_MS = (() => {
  if (process.env.CHAT_REPLY_STABLE_MS !== undefined) {
    const n = Number(process.env.CHAT_REPLY_STABLE_MS);
    return Number.isFinite(n) && n >= 0 ? n : 5_000;
  }
  return isFastMode() ? 1_500 : 5_000;
})();

/** Minimum assistant reply length before we consider completion checks. */
export const CHAT_REPLY_MIN_LENGTH = (() => {
  const n = Number(process.env.CHAT_REPLY_MIN_LENGTH);
  return Number.isFinite(n) && n > 0 ? n : 60;
})();

/** Brief pause after input re-enables so the final answer is visible (headed/video). */
export const CHAT_REPLY_OBSERVE_MS = (() => {
  if (process.env.CHAT_REPLY_OBSERVE_MS !== undefined) {
    const n = Number(process.env.CHAT_REPLY_OBSERVE_MS);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return isFastMode() ? 0 : 2_000;
})();

/** Pause between TC-014 steps (`TC014_STEP_SETTLE_MS` or `E2E_FAST=1`). */
export const TC014_STEP_SETTLE_MS =
  process.env.TC014_STEP_SETTLE_MS !== undefined ?
    Number(process.env.TC014_STEP_SETTLE_MS)
  : E2E_STEP_SETTLE_MS;

/** Ms to show filled prompt in headed runs before Send (`0` when `E2E_FAST=1`). */
export const CHAT_PROMPT_OBSERVE_MS = (() => {
  if (process.env.CHAT_PROMPT_OBSERVE_MS !== undefined) {
    const n = Number(process.env.CHAT_PROMPT_OBSERVE_MS);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return isFastMode() ? 0 : 2_000;
})();

/** Per-character delay when typing the prompt (`0` = instant fill in fast mode). */
export const CHAT_PROMPT_TYPING_DELAY_MS = (() => {
  if (process.env.CHAT_PROMPT_TYPING_DELAY_MS !== undefined) {
    const n = Number(process.env.CHAT_PROMPT_TYPING_DELAY_MS);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return isFastMode() ? 0 : 20;
})();
