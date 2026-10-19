const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Max wait for Export to become enabled after Generate (not full storyline completion). */
export const EXPORT_READY_AFTER_GENERATE_TIMEOUT_MS = parsePositiveInt(
  process.env.EXPORT_READY_AFTER_GENERATE_TIMEOUT_MS,
  25 * 60 * 1000,
);

/** TC-015 — open New deliverable → Settings → Generate → Export when ready. */
export const TC015_TEST_TIMEOUT_MS = parsePositiveInt(
  process.env.TC015_TEST_TIMEOUT_MS,
  30 * 60 * 1000,
);

/** Export progress modal (Collecting storyline → 100% complete). */
export const EXPORT_PROGRESS_TIMEOUT_MS = parsePositiveInt(
  process.env.EXPORT_PROGRESS_TIMEOUT_MS,
  5 * 60 * 1000,
);

/** Browser download event + file write. */
export const EXPORT_DOWNLOAD_TIMEOUT_MS = parsePositiveInt(
  process.env.EXPORT_DOWNLOAD_TIMEOUT_MS,
  5 * 60 * 1000,
);

export const TC015_STEP_SETTLE_MS = Number(process.env.TC015_STEP_SETTLE_MS) || 2_000;

/** Wait for on-screen storyline text before capture (Export may enable earlier). */
export const TC015_STORYLINE_CAPTURE_TIMEOUT_MS = parsePositiveInt(
  process.env.TC015_STORYLINE_CAPTURE_TIMEOUT_MS,
  3 * 60 * 1000,
);

/** sample deliverable — short capture before Export (Export is already enabled). */
export const TC015_SAMPLE_CAPTURE_TIMEOUT_MS = parsePositiveInt(
  process.env.TC015_SAMPLE_CAPTURE_TIMEOUT_MS,
  45 * 1000,
);

/** TC-015 — wait for export progress (100% or overlay dismiss). */
export const TC015_EXPORT_PROGRESS_TIMEOUT_MS = parsePositiveInt(
  process.env.TC015_EXPORT_PROGRESS_TIMEOUT_MS,
  90 * 1000,
);

/** After comparison — wait for export progress overlay to disappear before test ends. */
export const TC015_OVERLAY_CLOSE_TIMEOUT_MS = parsePositiveInt(
  process.env.TC015_OVERLAY_CLOSE_TIMEOUT_MS,
  30 * 1000,
);
