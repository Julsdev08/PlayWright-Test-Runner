import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.ADFUSE_BASE_URL;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  httpCredentials: { username: process.env.ADFUSE_BASIC_USER ?? '', password: process.env.ADFUSE_BASIC_PASSWORD ?? '' },
});
const page = await context.newPage();
const accounts = ['AdFuse', 'Bare Pets (PH)', 'Bare Pets Philippines', 'Impremis Marketing Ads Official', 'Impremis Marketing Ad Account 03/01/2026'];

async function login() {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(process.env.ADFUSE_EMAIL ?? '');
  await page.locator('input[type="password"]').first().fill(process.env.ADFUSE_PASSWORD ?? '');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

async function switchAccount(name) {
  await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.locator('button[aria-controls="account-dropdown-menu"]').click();
  await page.locator('#account-dropdown-menu').getByText(name, { exact: true }).click();
  await page.waitForTimeout(1000);
}

await login();
const result = [];
try {
  for (const account of accounts) {
    await switchAccount(account);
    await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    const cards = page.locator('[role="button"][aria-label^="Preview "]');
    const count = await cards.count();
    const mapped = [];
    for (let index = 0; index < Math.min(count, 12); index += 1) {
      await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(350);
      const currentCards = page.locator('[role="button"][aria-label^="Preview "]');
      const card = currentCards.nth(index);
      const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
      const aria = await card.getAttribute('aria-label');
      await card.click();
      await page.waitForTimeout(350);
      mapped.push({ index, aria, text, url: page.url() });
    }
    result.push({ account, count, mapped, body: (await page.locator('body').innerText()).slice(0, 10000) });
  }
  await fs.mkdir(path.resolve('test-results/adfuse-retest'), { recursive: true });
  await fs.writeFile(path.resolve('test-results/adfuse-retest/platform-ad-map.json'), JSON.stringify(result, null, 2));
  console.log(`Mapped ${result.length} accounts.`);
} finally {
  await browser.close();
}
