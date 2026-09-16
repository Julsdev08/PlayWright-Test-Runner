import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const outputDir = path.resolve('test-results/adfuse-retest');
await fs.mkdir(outputDir, { recursive: true });

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
  await page.goto(`${process.env.ADFUSE_BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: path.join(outputDir, 'login.png'), fullPage: true });

  const fields = await page.locator('input').evaluateAll((nodes) => nodes.map((node) => ({
    type: node.type,
    name: node.getAttribute('name'),
    placeholder: node.getAttribute('placeholder'),
    ariaLabel: node.getAttribute('aria-label'),
  })));
  console.log(JSON.stringify({ phase: 'login', url: page.url(), title: await page.title(), fields, body: (await page.locator('body').innerText()).slice(0, 4000) }, null, 2));

  const email = page.locator('input[type="email"], input[name*="email" i]').first();
  const password = page.locator('input[type="password"]').first();
  await email.fill(process.env.ADFUSE_EMAIL ?? '');
  await password.fill(process.env.ADFUSE_PASSWORD ?? '');
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.getByRole('button', { name: /sign in|log in|login/i }).click(),
  ]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outputDir, 'after-login.png'), fullPage: true });
  const links = await page.locator('a').evaluateAll((nodes) => nodes.slice(0, 100).map((node) => ({ text: node.textContent?.trim(), href: node.getAttribute('href') })));
  console.log(JSON.stringify({ phase: 'authenticated', url: page.url(), title: await page.title(), links, body: (await page.locator('body').innerText()).slice(0, 10000) }, null, 2));

  for (const route of ['/ads/index/all', '/ads/index/in-progress', '/ads/index/internal-approval', '/ads/index/approved', '/ads/index/archived', '/creative-studio/ads', '/creative-engine/creatives']) {
    await page.goto(`${process.env.ADFUSE_BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const routeLinks = await page.locator('a').evaluateAll((nodes) => nodes.map((node) => ({ text: node.textContent?.trim(), href: node.href })).filter((item) => item.href.includes('/ads/') || item.href.includes('/creative')));
    const actionNodes = await page.locator('button, [role="button"], [onclick], [wire\\:click], [x-on\\:click], [data-id], [data-ad-id]').evaluateAll((nodes) => nodes.slice(0, 300).map((node) => ({
      tag: node.tagName,
      text: node.textContent?.trim().slice(0, 300),
      role: node.getAttribute('role'),
      onclick: node.getAttribute('onclick'),
      wireClick: node.getAttribute('wire:click'),
      xClick: node.getAttribute('x-on:click'),
      dataId: node.getAttribute('data-id'),
      dataAdId: node.getAttribute('data-ad-id'),
    })).filter((item) => item.text || item.onclick || item.wireClick || item.xClick || item.dataId || item.dataAdId));
    console.log(JSON.stringify({ phase: 'route', route, url: page.url(), links: routeLinks.slice(0, 200), actionNodes, body: (await page.locator('body').innerText()).slice(0, 24000) }, null, 2));
  }
} finally {
  await browser.close();
}
