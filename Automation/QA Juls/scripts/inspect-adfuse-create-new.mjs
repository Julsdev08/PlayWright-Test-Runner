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

try {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(process.env.ADFUSE_EMAIL ?? '');
  await page.locator('input[type="password"]').first().fill(process.env.ADFUSE_PASSWORD ?? '');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Create New/i }).click();
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => ({
    url: location.href,
    body: document.body.innerText.slice(0, 18000),
    dialogs: [...document.querySelectorAll('[role="dialog"], dialog')].map((el) => el.outerHTML.slice(0, 12000)),
    buttons: [...document.querySelectorAll('button, [role="button"]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map((el) => ({ text: (el.textContent || '').trim().replace(/\s+/g, ' '), aria: el.getAttribute('aria-label'), disabled: el.disabled, html: el.outerHTML.slice(0, 1600) })),
    controls: [...document.querySelectorAll('input, select, textarea, [role="combobox"]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map((el) => ({ tag: el.tagName, text: (el.textContent || '').trim().replace(/\s+/g, ' '), placeholder: el.getAttribute('placeholder'), html: el.outerHTML.slice(0, 1600) })),
  }));
  await fs.mkdir(path.resolve('test-results/adfuse-retest'), { recursive: true });
  await fs.writeFile(path.resolve('test-results/adfuse-retest/create-new.json'), JSON.stringify(data, null, 2));
  await page.screenshot({ path: path.resolve('test-results/adfuse-retest/create-new.png'), fullPage: true });
  console.log('Inspected Create New dialog.');
} finally {
  await browser.close();
}
