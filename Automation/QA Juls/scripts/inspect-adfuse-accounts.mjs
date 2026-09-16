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
  const switcher = page.getByRole('button').filter({ hasText: 'Impremis Marketing Ad Account 03/01/2026' }).first();
  await switcher.click();
  await page.waitForTimeout(1800);
  const data = await page.evaluate(() => ({
    body: document.body.innerText.slice(0, 12000),
    menu: [...document.querySelectorAll('[role="menu"], [role="listbox"]')].map((el) => el.innerText),
    candidates: [...document.querySelectorAll('button, [role="option"], [role="menuitem"], a')].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && /Meta|Google|TikTok|Reddit|AdFuse|Bare Pets|Impremis/i.test(el.textContent || '');
    }).map((el) => ({ tag: el.tagName, text: (el.textContent || '').trim().replace(/\s+/g, ' '), role: el.getAttribute('role'), href: el.getAttribute('href'), html: el.outerHTML.slice(0, 1800) })),
    accountLeaves: [...document.querySelectorAll('body *')].filter((el) => {
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || '').trim();
      return rect.width > 0 && rect.height > 0 && el.children.length === 0 && /^(AdFuse|Bare Pets \(PH\)|Bare Pets Philippines|Impremis Marketing Ads Official)$/.test(text);
    }).map((el) => ({ tag: el.tagName, text: el.textContent.trim(), parent: el.parentElement?.outerHTML.slice(0, 2200) })),
  }));
  await fs.mkdir(path.resolve('test-results/adfuse-retest'), { recursive: true });
  await fs.writeFile(path.resolve('test-results/adfuse-retest/accounts.json'), JSON.stringify(data, null, 2));
  console.log('Inspected account switcher.');
} finally {
  await browser.close();
}
