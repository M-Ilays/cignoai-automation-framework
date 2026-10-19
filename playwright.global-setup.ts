import type { FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getDefaultStorageStatePath } from './playwright.default-session';

/**
 * Validates default session when reusing cookies only (SKIP_GLOBAL_LOGIN).
 * Loads `.env` from the repo root so single-file / IDE runs still see BASE_URL and flags.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const envPath = path.resolve(__dirname, 'src/config/.env');
  dotenv.config({ path: envPath });

  const skipGlobalLogin =
    process.env.SKIP_GLOBAL_LOGIN === 'true' || process.env.SKIP_GLOBAL_LOGIN === '1';
  const storagePath = getDefaultStorageStatePath(__dirname);

  if (!fs.existsSync(storagePath)) {
    if (skipGlobalLogin) {
      throw new Error(
        `[Playwright] Default session file is missing:\n  ${storagePath}\n` +
          `SKIP_GLOBAL_LOGIN is enabled. Generate it with:\n  npm run test:refresh-session\n` +
          `Or set PLAYWRIGHT_STORAGE_STATE to an existing storage JSON path.`,
      );
    }
    console.warn(
      `[Playwright] No session file yet at ${storagePath} — the setup project will create it when enabled.`,
    );
    return;
  }

  let parsed: { cookies?: unknown[] };
  try {
    parsed = JSON.parse(fs.readFileSync(storagePath, 'utf-8')) as { cookies?: unknown[] };
  } catch {
    throw new Error(`[Playwright] Default session file is not valid JSON:\n  ${storagePath}`);
  }

  const cookieCount = Array.isArray(parsed.cookies) ? parsed.cookies.length : 0;
  if (skipGlobalLogin && cookieCount === 0) {
    throw new Error(
      `[Playwright] Default session has no cookies:\n  ${storagePath}\n` +
        `Refresh the session with:\n  npm run test:refresh-session`,
    );
  }

  if (cookieCount > 0) {
    console.log(`[Playwright] Default session: ${cookieCount} cookie(s) → ${storagePath}`);
    if (skipGlobalLogin) {
      console.log('[Playwright] Cookies-only mode — tests will not run Auth0 login (refresh: npm run test:refresh-session)');
    }

    const sessionCookie = Array.isArray(parsed.cookies)
      ? (parsed.cookies as { name?: string; expires?: number }[]).find((c) => c.name === '__session')
      : undefined;
    const expires = sessionCookie?.expires;
    if (typeof expires === 'number' && expires > 0) {
      const expiresMs = expires > 1e12 ? expires : expires * 1000;
      const hoursLeft = (expiresMs - Date.now()) / (60 * 60 * 1000);
      if (hoursLeft <= 0) {
        console.warn(
          `[Playwright] __session cookie expired — tests will hit Auth0 until you run:\n  npm run test:refresh-session`,
        );
      } else if (hoursLeft < 6) {
        console.warn(`[Playwright] __session expires in ~${hoursLeft.toFixed(1)}h — plan npm run test:refresh-session`);
      }
    }
  }
}
