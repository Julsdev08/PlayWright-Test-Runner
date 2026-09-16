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
  await page.goto(`${baseURL}/ads/google/191/edit`, { waitUntil: 'domcontentloaded' });
  const sources = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.src));
  const findings = [];
  for (const src of sources) {
    const response = await context.request.get(src);
    const text = await response.text();
    const matches = [...text.matchAll(/.{0,140}(?:meta|facebook).{0,180}/ig)].slice(0, 40).map((match) => match[0]);
    const routeMatches = [...text.matchAll(/.{0,120}\/ads\/[A-Za-z0-9_\/-]{1,80}.{0,160}/g)].slice(0, 80).map((match) => match[0]);
    if (matches.length || routeMatches.length) findings.push({ src, matches, routeMatches });
  }
  const appSource = await (await context.request.get(sources[0])).text();
  const componentMatches = [...appSource.matchAll(/.{0,180}(?:MetaAd|FacebookAd|MetaForm|Meta.*Form).{0,240}/ig)].slice(0, 100).map((match) => match[0]);
  const manifestResponse = await context.request.get(`${baseURL}/build-staging/manifest.json`);
  const manifestText = await manifestResponse.text();
  const manifestMatches = manifestText.split('\n').filter((line) => /meta|facebook/i.test(line)).slice(0, 300);
  console.log(JSON.stringify({ sources, componentMatches, manifestStatus: manifestResponse.status(), manifestMatches, findings }, null, 2));
} finally {
  await browser.close();
}
