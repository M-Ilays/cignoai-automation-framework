import { expect, Page } from '@playwright/test';

/** True when the browser was redirected to Auth0 / login (cookies missing or expired). */
export function isAuthLoginPageUrl(url: string): boolean {
  return url.includes('auth0.com') || url.includes('/u/login');
}

/**
 * Open home using the Playwright `storageState` session — **never** logs in.
 * Fails fast with refresh instructions if cookies are stale.
 */
export async function gotoAppHomeWithSession(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('load');
  await assertCookiesSessionActive(page);
}

/**
 * Assert the app loaded with a saved session — **never** performs login.
 * Fails fast with refresh instructions if cookies are stale.
 */
export async function assertCookiesSessionActive(page: Page): Promise<void> {
  if (isAuthLoginPageUrl(page.url())) {
    throw new Error(
      'Session cookies are missing or expired (Auth0 login page shown). ' +
        'Tests do not log in automatically. Refresh once:\n' +
        '  npm run test:refresh-session',
    );
  }

  const auth0Email = page.locator('input#username');
  if (await auth0Email.isVisible().catch(() => false)) {
    throw new Error(
      'Session cookies are missing or expired (Auth0 email field visible). ' +
        'Refresh once:\n' +
        '  npm run test:refresh-session',
    );
  }

  await expect(page.getByPlaceholder(/search clients/i)).toBeVisible({ timeout: 25_000 });
}
