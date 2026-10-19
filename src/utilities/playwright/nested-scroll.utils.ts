import type { Page } from '@playwright/test';

/**
 * Scroll containers commonly used by Radix / Tailwind layouts on client detail views.
 * Kept in utilities so Page Objects stay orchestration + locators (reference: separation of concerns).
 */
export const NESTED_SCROLLABLE_SELECTOR =
  '[data-radix-scroll-area-viewport], [data-scrollable], .overflow-y-auto, .overflow-y-scroll, .overflow-auto, main, [role="main"]';

/**
 * Snap window and nested scrollers to maximum scrollTop until stable (handles lazy-growing content).
 */
export async function flushNestedScrollContainersToBottom(page: Page): Promise<void> {
  for (let r = 0; r < 28; r++) {
    const changed = await page.evaluate((sel: string) => {
      let any = false;
      const snap = (el: HTMLElement) => {
        const max = el.scrollHeight - el.clientHeight;
        if (max <= 0) return;
        if (el.scrollTop < max - 2) {
          el.scrollTop = max;
          any = true;
        }
      };
      document.querySelectorAll(sel).forEach((n) => snap(n as HTMLElement));
      const doc = document.documentElement;
      const winMax = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight;
      if (winMax > 0 && window.scrollY < winMax - 2) {
        window.scrollTo(0, winMax);
        any = true;
      }
      return any;
    }, NESTED_SCROLLABLE_SELECTOR);
    await page.waitForTimeout(45);
    if (!changed) {
      break;
    }
  }
}

export interface WarmScrollOptions {
  /** Incremental scroll rounds before flush (default 6). */
  rounds?: number;
  /** Pixels per bump per container (default 600). */
  delta?: number;
  /** Pause between rounds in ms (default 50). */
  settleMs?: number;
}

/**
 * Nudge window + nested scroll areas downward, then flush to true bottom (client detail / Projects).
 */
export async function warmScrollClientDetailTowardBottom(
  page: Page,
  options?: WarmScrollOptions,
): Promise<void> {
  const rounds = options?.rounds ?? 6;
  const delta = options?.delta ?? 600;
  const settleMs = options?.settleMs ?? 50;

  for (let k = 0; k < rounds; k++) {
    await page.evaluate((d: number) => window.scrollBy(0, d), delta);
    await page
      .locator('main, [role="main"]')
      .first()
      .evaluate(
        (el, d: number) => {
          el.scrollTop += d;
        },
        delta,
      )
      .catch(() => {});

    const scrollers = page.locator(NESTED_SCROLLABLE_SELECTOR);
    const rawCount = await scrollers.count();
    const n = Math.min(rawCount, 24);
    for (let j = 0; j < n; j++) {
      await scrollers.nth(j).evaluate((el, d: number) => {
        el.scrollTop += d;
      }, delta);
    }
    await page.waitForTimeout(settleMs);
  }

  await flushNestedScrollContainersToBottom(page);
  await page.waitForTimeout(120);
  await flushNestedScrollContainersToBottom(page);
}
