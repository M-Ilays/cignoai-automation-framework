import { test, expect } from '@playwright/test';
import { gotoAppHomeWithSession } from '@utilities/helpers/session-auth.utils';

test.describe('Smoke: application load', () => {
  test('Home page loads with cookie session (not Auth0 login)', async ({ page }) => {
    await gotoAppHomeWithSession(page);
    await expect(page).not.toHaveURL('about:blank');
  });
});
