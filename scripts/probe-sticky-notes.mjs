import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cookiesPath = path.join(__dirname, '../src/cookies/admin.json');
const NOTE = 'PROBE sticky notes TC017 — deliverable output edit TC017';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: cookiesPath,
  baseURL: 'https://cigno-stg.vercel.app',
});
const page = await context.newPage();
await page.goto('/');
await page.waitForLoadState('load');

if (/auth0|\/u\/login/i.test(page.url())) {
  console.log('FAIL: Auth0 login');
  await browser.close();
  process.exit(1);
}

await page.getByPlaceholder(/search clients/i).fill('New deliverable');
await page.waitForTimeout(800);
await page.getByText(/^New deliverable$/i).first().click();
await page.waitForTimeout(5000);

const tab3 = page.getByText(/^3\.\s*Deliverable$/i).or(page.getByRole('button', { name: /^3$/ }));
if (await tab3.first().isVisible().catch(() => false)) {
  await tab3.first().click();
  await page.waitForTimeout(2000);
}

console.log('URL:', page.url());
const mainCount = await page.locator('main').count();
console.log('main count:', mainCount);
for (let m = 0; m < mainCount; m++) {
  const main = page.locator('main').nth(m);
  const sticky = await main.getByText(/^Sticky notes$/i).isVisible().catch(() => false);
  const banner = await main.getByText(/Update your Storyline/i).isVisible().catch(() => false);
  const tas = await main.locator('textarea').count();
  console.log(`  main[${m}] sticky=${sticky} banner=${banner} textareas=${tas}`);
}

const pageSticky = await page.getByText(/^Sticky notes$/i).isVisible().catch(() => false);
console.log('page Sticky notes visible:', pageSticky);

const allTa = page.locator('textarea');
const n = await allTa.count();
console.log('page textarea count:', n);
for (let i = 0; i < n; i++) {
  const t = allTa.nth(i);
  const ph = (await t.getAttribute('placeholder')) ?? '';
  if (!/business context|Explain/i.test(ph)) continue;
  const vis = await t.isVisible().catch(() => false);
  const box = await t.boundingBox().catch(() => null);
  console.log(`  textarea[${i}] placeholder=${ph.slice(0, 50)}... visible=${vis} box=${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'null'}`);
}

const target = page
  .getByText(/^Sticky notes$/i)
  .first()
  .locator('xpath=ancestor::*[1]/following::textarea[1]')
  .or(page.locator("xpath=//*[normalize-space()='Sticky notes']/following::textarea[1]"))
  .first();

console.log('\nTarget from Sticky notes label:', {
  visible: await target.isVisible({ timeout: 20_000 }).catch(() => false),
});

if (await target.isVisible().catch(() => false)) {
  await target.scrollIntoViewIfNeeded();
  await target.click();
  await target.fill(NOTE);
  const after = await target.inputValue();
  const update = page.getByRole('button', { name: /^Update section$/i }).filter({ visible: true }).first();
  console.log('After fill:', {
    len: after.length,
    updateVisible: await update.isVisible().catch(() => false),
    updateEnabled: await update.isEnabled({ timeout: 5_000 }).catch(() => false),
  });
}

await page.screenshot({ path: path.join(__dirname, '../test-results/probe-sticky-notes.png'), fullPage: true });
await browser.close();
