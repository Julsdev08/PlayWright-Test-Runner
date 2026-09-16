import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.ADFUSE_BASE_URL;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, httpCredentials: { username: process.env.ADFUSE_BASIC_USER ?? '', password: process.env.ADFUSE_BASIC_PASSWORD ?? '' } });
const page = await context.newPage();
try {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(process.env.ADFUSE_EMAIL ?? '');
  await page.locator('input[type="password"]').first().fill(process.env.ADFUSE_PASSWORD ?? '');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await page.locator('button[aria-controls="account-dropdown-menu"]').click();
  await page.locator('#account-dropdown-menu').getByText('Impremis Marketing Ads Official', { exact: true }).click();
  await page.waitForTimeout(800);
  await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
  const editButtons = page.locator('button[aria-label="Edit ad"]');
  const editCount = await editButtons.count();
  const editRoutes = [];
  for (let index = 0; index < editCount; index += 1) {
    await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(350);
    const button = page.locator('button[aria-label="Edit ad"]').nth(index);
    const containerText = await button.locator('xpath=ancestor::div[contains(@class,"rounded-card")][1]').innerText().catch(() => '');
    await button.click();
    await page.waitForTimeout(400);
    editRoutes.push({ index, url: page.url(), containerText: containerText.replace(/\s+/g, ' ').slice(0, 800) });
  }
  await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
  await page.locator('[role="button"][aria-label^="Preview "]').first().click();
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => ({
    url: location.href,
    modalText: [...document.querySelectorAll('.fixed.inset-0')].map((el) => el.innerText).join('\n').slice(0, 12000),
    links: [...document.querySelectorAll('.fixed.inset-0 a')].map((el) => ({ text: (el.textContent || '').trim(), href: el.href, html: el.outerHTML.slice(0, 2000) })),
    buttons: [...document.querySelectorAll('.fixed.inset-0 button, .fixed.inset-0 [role="button"]')].map((el) => ({ text: (el.textContent || '').trim().replace(/\s+/g, ' '), aria: el.getAttribute('aria-label'), html: el.outerHTML.slice(0, 2000) })),
  }));
  data.editCount = editCount;
  data.editRoutes = editRoutes;
  await fs.mkdir(path.resolve('test-results/adfuse-retest'), { recursive: true });
  await fs.writeFile(path.resolve('test-results/adfuse-retest/meta-modal.json'), JSON.stringify(data, null, 2));
  console.log('Inspected Meta modal.');
} finally {
  await browser.close();
}
