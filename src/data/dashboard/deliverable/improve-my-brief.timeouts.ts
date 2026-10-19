const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Wait for **Improving…** / **Generating your new brief…** to finish (Jam ~53s + buffer). */
export const IMPROVE_BRIEF_AI_TIMEOUT_MS = parsePositiveInt(
  process.env.IMPROVE_BRIEF_AI_TIMEOUT_MS,
  6 * 60 * 1000,
);

/** After **Generate Brief** — apply adaptation to the editor. */
export const GENERATE_BRIEF_APPLY_TIMEOUT_MS = parsePositiveInt(
  process.env.GENERATE_BRIEF_APPLY_TIMEOUT_MS,
  3 * 60 * 1000,
);

/** After brief **submit** (send) — **Generating your new brief…** until done (Jam ~65s + buffer). */
export const BRIEF_SUBMIT_GENERATION_TIMEOUT_MS = parsePositiveInt(
  process.env.BRIEF_SUBMIT_GENERATION_TIMEOUT_MS,
  4 * 60 * 1000,
);

/** Whole TC-012 (open deliverable + AI + compare + generate). */
export const TC012_TEST_TIMEOUT_MS = parsePositiveInt(process.env.TC012_TEST_TIMEOUT_MS, 15 * 60 * 1000);
