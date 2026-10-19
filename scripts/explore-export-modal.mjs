import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const storage = path.resolve('src/cookies/admin.json');
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({
  storageState: fs.existsSync(storage) ? storage : undefined,
  acceptDownloads: true,
})).newPage();
await page.goto('https://cigno-stg.vercel.app');
await page.getByRole('textbox', { name: /Search Clients/i }).fill('sample deliverable');
await page.waitForTimeout(800);
await page.getByText(/^sample deliverable$/i).first().click();
await page.waitForTimeout(3000);
const exportBtn = page.getByRole('button', { name: /^Export$/i }).first();
const heading = page.getByRole('heading', { name: /Exporting PPTX/i });
page.waitForEvent('download').then((d) => d.saveAs('test-results/x.pptx'));
await exportBtn.click();
await heading.waitFor({ state: 'visible' });
const parent = heading.locator('xpath=ancestor::div[contains(@class,"fixed")][1]');
console.log('fixed parent count', await parent.count());
console.log('parent html', (await parent.first().evaluate((e) => e.outerHTML)).slice(0, 800));
await browser.close();
