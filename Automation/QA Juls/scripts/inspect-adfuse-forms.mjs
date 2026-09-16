import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.ADFUSE_BASE_URL;
const outputDir = path.resolve('test-results/adfuse-retest/forms');
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

async function login() {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(process.env.ADFUSE_EMAIL ?? '');
  await page.locator('input[type="password"]').first().fill(process.env.ADFUSE_PASSWORD ?? '');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

await login();
const routes = [
  '/ads/google/191/edit',
  '/ads/tiktok/179/edit',
  '/ads/meta/166/edit',
  '/ads/facebook/166/edit',
  '/ads/meta/151/edit',
  '/ads/facebook/151/edit',
  '/ads/166/edit',
  '/ads/151/edit',
  '/ads/reddit/187/edit',
  '/ads/reddit/188/edit',
  '/ads/reddit/189/edit',
  '/ads/reddit/190/edit',
  '/ads/reddit/132/edit',
  '/ads/reddit/125/edit',
];
const results = [];

try {
  for (const route of routes) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const slug = route.replaceAll('/', '_').replace(/^_/, '');
    await page.screenshot({ path: path.join(outputDir, `${slug}.png`), fullPage: true });

    const details = await page.evaluate(() => {
      const visible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const descriptor = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id || null,
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          role: el.getAttribute('role'),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 500),
          ariaLabel: el.getAttribute('aria-label'),
          placeholder: el.getAttribute('placeholder'),
          disabled: 'disabled' in el ? el.disabled : el.getAttribute('aria-disabled'),
          borderRadius: style.borderRadius,
          cursor: style.cursor,
          display: style.display,
          position: style.position,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          html: el.outerHTML.slice(0, 1400),
        };
      };

      const labelNodes = [...document.querySelectorAll('label')].filter(visible).map(descriptor);
      const controlNodes = [...document.querySelectorAll('input, textarea, select, [role="combobox"], [role="listbox"]')].filter(visible).map(descriptor);
      const buttonNodes = [...document.querySelectorAll('button, [role="button"]')].filter(visible).map(descriptor);
      const relevantTextNodes = [...document.querySelectorAll('body *')].filter((el) => {
        if (!visible(el) || el.children.length) return false;
        const text = (el.textContent || '').trim();
        return /campaign|ad group|asset group|safe zone|view mode|in progress|required|internal approval/i.test(text);
      }).map(descriptor);

      return {
        title: document.title,
        body: document.body.innerText.slice(0, 16000),
        labels: labelNodes,
        controls: controlNodes,
        buttons: buttonNodes,
        relevantTextNodes,
      };
    });
    results.push({ route, url: page.url(), ...details });
  }

  await fs.writeFile(path.resolve('test-results/adfuse-retest/form-inspection.json'), JSON.stringify(results, null, 2));
  console.log(`Inspected ${results.length} forms.`);
} finally {
  await browser.close();
}
