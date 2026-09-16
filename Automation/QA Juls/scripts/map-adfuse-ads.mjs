import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.ADFUSE_BASE_URL;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  httpCredentials: {
    username: process.env.ADFUSE_BASIC_USER ?? '',
    password: process.env.ADFUSE_BASIC_PASSWORD ?? '',
  },
});
const page = await context.newPage();

try {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(process.env.ADFUSE_EMAIL ?? '');
  await page.locator('input[type="password"]').first().fill(process.env.ADFUSE_PASSWORD ?? '');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });

  await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const cards = page.locator('[role="button"]').filter({ hasText: 'u/Jordan_g_Impremis' });
  const cardCount = await cards.count();
  const mapped = [];

  for (let index = 0; index < cardCount; index += 1) {
    await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const currentCards = page.locator('[role="button"]').filter({ hasText: 'u/Jordan_g_Impremis' });
    const card = currentCards.nth(index);
    const text = (await card.innerText()).replace(/\s+/g, ' ').trim();
    await card.click();
    await page.waitForTimeout(700);
    mapped.push({ index, text, url: page.url(), title: await page.title(), heading: (await page.locator('body').innerText()).slice(0, 1800).replace(/\s+/g, ' ') });
  }

  const output = JSON.stringify({ cardCount, mapped }, null, 2);
  await fs.mkdir(path.resolve('test-results/adfuse-retest'), { recursive: true });
  await fs.writeFile(path.resolve('test-results/adfuse-retest/ad-map.json'), output);
  console.log(`Mapped ${mapped.length} ads.`);
} finally {
  await browser.close();
}
