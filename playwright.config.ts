import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { getDefaultStorageStatePath } from './playwright.default-session';

dotenv.config({ path: path.resolve(__dirname, 'src/config/.env') });
const { BASE_URL } = process.env;

/**
 * Cookies-only by default — specs reuse `src/cookies/admin.json` (no Auth0 login per run).
 * Login runs only for `npm run test:refresh-session` (`SKIP_GLOBAL_LOGIN=false`).
 */
const skipGlobalLogin = process.env.SKIP_GLOBAL_LOGIN !== 'false' && process.env.SKIP_GLOBAL_LOGIN !== '0';

const defaultStorageStatePath = getDefaultStorageStatePath(__dirname);

export default defineConfig({
  globalSetup: path.resolve(__dirname, 'playwright.global-setup.ts'),
  tsconfig: path.resolve(__dirname, 'tsconfig.json'),
  testDir: './src/specs/',
  timeout: 60 * 1000,
  expect: {
    timeout: 30 * 1000,
  },
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: [
    [`list`],
    ['allure-playwright', { outputFolder: 'allure-results' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    /** Applied to every project that does not override (see setup = empty session for fresh login). */
    storageState: defaultStorageStatePath,
    /** Avoid Windows ENOENT on teardown when trace zip was never finalized (passing tests). */
    video: process.env.CI ? 'on' : 'retain-on-failure',
    actionTimeout: 30 * 1000,
    baseURL: BASE_URL,
    headless: process.env.CI ? true : false,
    trace: process.env.CI ? 'on' : 'retain-on-failure',
    viewport: process.env.CI ? { width: 1920, height: 1200 } : null,
    launchOptions: {
      args: process.env.CI ? [] : ['--start-maximized'],
    },
  },
  projects: [
    ...(skipGlobalLogin
      ? []
      : [
          {
            name: 'setup',
            testMatch: ['**/login.setup.spec.ts'],
            use: {
              /** Fresh context so login setup can perform Auth0 and overwrite the default session file. */
              storageState: { cookies: [], origins: [] },
            },
          },
        ]),
    {
      name: 'Chromium',
      testIgnore: ['**/login.setup.spec.ts'],
      dependencies: skipGlobalLogin ? [] : ['setup'],
      use: {
        viewport: process.env.CI ? { width: 1920, height: 1200 } : null,
        launchOptions: {
          args: process.env.CI ? [] : ['--start-maximized'],
        },
      },
    },
  ],
});
