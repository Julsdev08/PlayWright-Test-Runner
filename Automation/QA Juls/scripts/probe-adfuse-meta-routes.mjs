import { chromium } from 'playwright';

const baseURL = process.env.ADFUSE_BASE_URL;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ httpCredentials: { username: process.env.ADFUSE_BASIC_USER ?? '', password: process.env.ADFUSE_BASIC_PASSWORD ?? '' } });
const page = await context.newPage();
try {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(process.env.ADFUSE_EMAIL ?? '');
  await page.locator('input[type="password"]').first().fill(process.env.ADFUSE_PASSWORD ?? '');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  const slugs = ['meta', 'facebook', 'meta-ads', 'meta_ads', 'meta-ad', 'facebook-ads', 'facebook_ads', 'facebook-ad', 'facebook_ad'];
  const results = [];
  for (const id of [166, 151, 5, 40]) {
    for (const slug of slugs) {
      const response = await context.request.get(`${baseURL}/ads/${slug}/${id}/edit`);
      const body = await response.text();
      results.push({ id, slug, status: response.status(), finalURL: response.url(), found: /Edit (Meta|Facebook) Ad/i.test(body), title: body.match(/<title>([^<]+)/i)?.[1] ?? null });
    }
  }
  console.log(JSON.stringify(results.filter((item) => item.status !== 404 || item.found), null, 2));
} finally {
  await browser.close();
}
