import { E2E_STEP_SETTLE_MS } from '@data/dashboard/deliverable/e2e-pacing.timeouts';

/** TC-010 — full flow with observation pauses (headed-friendly). */
export const TC010_TEST_TIMEOUT_MS = 600_000;

/** Pause after each major step (`TC010_STEP_SETTLE_MS` or `E2E_OBSERVE_MS` / `E2E_FAST=1`). */
export const TC010_STEP_SETTLE_MS =
  process.env.TC010_STEP_SETTLE_MS !== undefined ?
    Number(process.env.TC010_STEP_SETTLE_MS)
  : E2E_STEP_SETTLE_MS;

/** Settle before typing into brief / prompt fields. */
export const BRIEF_ENTRY_SETTLE_MS =
  process.env.BRIEF_ENTRY_SETTLE_MS !== undefined ?
    Number(process.env.BRIEF_ENTRY_SETTLE_MS)
  : E2E_STEP_SETTLE_MS;
