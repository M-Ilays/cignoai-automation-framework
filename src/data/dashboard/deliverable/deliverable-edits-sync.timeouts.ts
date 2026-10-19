import { E2E_STEP_SETTLE_MS } from '@data/dashboard/deliverable/e2e-pacing.timeouts';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** After Reset and Regenerate — storyline regen (staging ~10–25 min). */
export const TC017_REGENERATE_TIMEOUT_MS = parsePositiveInt(
  process.env.TC017_REGENERATE_TIMEOUT_MS,
  35 * 60 * 1000,
);

/** Whole TC-017 (navigation + optional regen + Executive Summary sticky notes + sync). */
export const TC017_TEST_TIMEOUT_MS = parsePositiveInt(
  process.env.TC017_TEST_TIMEOUT_MS,
  60 * 60 * 1000,
);

/** Wait for generated body in a workplan section before Update section (empty section → build-request error). */
export const TC017_SECTION_CONTENT_TIMEOUT_MS = parsePositiveInt(
  process.env.TC017_SECTION_CONTENT_TIMEOUT_MS,
  5 * 60 * 1000,
);

/** Poll until sync marker appears on Deliverable output after regen (step 3). */
export const TC017_MARKER_APPEAR_POLL_MS = parsePositiveInt(
  process.env.TC017_MARKER_APPEAR_POLL_MS,
  6 * 60 * 1000 + 90_000,
);

/** Poll until sync marker is still on Deliverable after Brief/Settings return (step 4). */
export const TC017_MARKER_RETAIN_POLL_MS = parsePositiveInt(
  process.env.TC017_MARKER_RETAIN_POLL_MS,
  5 * 60 * 1000 + 45_000,
);

export const TC017_STEP_SETTLE_MS =
  process.env.TC017_STEP_SETTLE_MS !== undefined ?
    Number(process.env.TC017_STEP_SETTLE_MS)
  : E2E_STEP_SETTLE_MS;

/** Competition storyline phase can take several minutes before sticky notes unlock. */
export const TC017_COMPETITION_PHASE_TIMEOUT_MS = parsePositiveInt(
  process.env.TC017_COMPETITION_PHASE_TIMEOUT_MS,
  15 * 60 * 1000,
);

/** Poll until sticky-notes textarea (xpath) is visible and editable. */
export const TC017_STICKY_NOTES_ACTIVE_TIMEOUT_MS = parsePositiveInt(
  process.env.TC017_STICKY_NOTES_ACTIVE_TIMEOUT_MS,
  10 * 60 * 1000,
);

/** Pause after typing in Sticky notes before clicking Update section. */
export const TC017_STICKY_NOTES_BEFORE_UPDATE_MS = parsePositiveInt(
  process.env.TC017_STICKY_NOTES_BEFORE_UPDATE_MS,
  4_000,
);

/** After Update section — section refresh + full deliverable generation. */
export const TC017_POST_UPDATE_GENERATION_TIMEOUT_MS = parsePositiveInt(
  process.env.TC017_POST_UPDATE_GENERATION_TIMEOUT_MS,
  30 * 60 * 1000,
);

/** Per workplan section — wait for **Update section** to finish before capturing "after" output. */
export const TC017_SECTION_UPDATE_TIMEOUT_MS = parsePositiveInt(
  process.env.TC017_SECTION_UPDATE_TIMEOUT_MS,
  10 * 60 * 1000,
);

/** Soft wait for section storyline before edit (sticky+export counts as ready). */
export const TC017_SOFT_SECTION_CONTENT_MS = parsePositiveInt(
  process.env.TC017_SOFT_SECTION_CONTENT_MS,
  45_000,
);
