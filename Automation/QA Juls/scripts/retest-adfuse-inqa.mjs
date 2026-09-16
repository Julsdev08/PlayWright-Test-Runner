import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.ADFUSE_BASE_URL;
const outputDir = path.resolve('test-results/adfuse-retest/focused');
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

async function switchAccount(name) {
  await page.locator('button[aria-controls="account-dropdown-menu"]').click();
  await page.locator('#account-dropdown-menu').getByText(name, { exact: true }).click();
  await page.waitForTimeout(900);
}

async function visibleDiagnostics() {
  return page.evaluate(() => {
    const visible = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    return {
      inputs: [...document.querySelectorAll('input')].filter(visible).map((el) => ({
        placeholder: el.placeholder,
        value: el.value,
        type: el.type,
        outer: el.outerHTML.slice(0, 1000),
      })),
      buttons: [...document.querySelectorAll('button')].filter(visible).map((el) => ({
        text: (el.textContent || '').trim().replace(/\s+/g, ' '),
        disabled: el.disabled,
        expanded: el.getAttribute('aria-expanded'),
        outer: el.outerHTML.slice(0, 1200),
      })).filter((x) => x.text),
      text: document.body.innerText.slice(0, 20000),
    };
  });
}

async function inspectMetaSearch() {
  await switchAccount('Impremis Marketing Ads Official');
  await page.goto(`${baseURL}/ads/166/edit`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => [...document.querySelectorAll('div.fixed.inset-0')].every((el) => {
    const s = getComputedStyle(el);
    return s.display === 'none' || s.visibility === 'hidden' || el.getBoundingClientRect().width === 0;
  }), null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => {
    const debugbar = document.querySelector('.phpdebugbar');
    if (debugbar) debugbar.style.display = 'none';
  });
  const cancelLeave = page.getByRole('button', { name: /^Cancel$/i });
  if ((await cancelLeave.count()) > 0 && await cancelLeave.isVisible()) {
    await cancelLeave.evaluate((el) => el.click());
    await page.waitForTimeout(300);
  }
  const campaignButton = page.getByRole('button', { name: /Select campaign/i }).first();
  await campaignButton.click();
  await page.waitForTimeout(600);
  const campaignOpen = await visibleDiagnostics();
  await page.screenshot({ path: path.join(outputDir, 'meta-campaign-open.png'), fullPage: true });

  const search = page.locator('input[placeholder*="search" i]:visible').last();
  const campaignSearchPresent = (await search.count()) > 0;
  let selectedCampaign = null;
  let adSetOpen = null;
  let campaignMenuHtml = null;
  let campaignCandidateTexts = [];
  if (campaignSearchPresent) {
    const menu = search.locator('xpath=ancestor::div[contains(@class,"absolute")][1]');
    campaignMenuHtml = await menu.evaluate((el) => el.outerHTML.slice(0, 20000)).catch(() => null);
    const candidates = menu.locator('button:visible, [role="option"]:visible');
    const count = await candidates.count();
    campaignCandidateTexts = await candidates.allInnerTexts();
    for (let i = 0; i < count; i += 1) {
      const candidate = candidates.nth(i);
      const text = (await candidate.innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
      if (text && !/search|clear|close/i.test(text)) {
        selectedCampaign = text;
        await candidate.evaluate((el) => el.click());
        break;
      }
    }
  }
  await page.waitForTimeout(900);
  const adSetButton = page.getByRole('button', { name: /Select ad set/i }).first();
  const adSetEnabled = (await adSetButton.count()) > 0 && !(await adSetButton.isDisabled());
  if (adSetEnabled) {
    await adSetButton.evaluate((el) => el.click());
    await page.waitForTimeout(600);
    adSetOpen = await visibleDiagnostics();
    await page.screenshot({ path: path.join(outputDir, 'meta-adset-open.png'), fullPage: true });
  }
  return {
    campaignSearchPresent,
    campaignSearchPlaceholders: campaignOpen.inputs.map((x) => x.placeholder).filter(Boolean),
    campaignMenuHtml,
    campaignCandidateTexts,
    campaignVisibleText: campaignOpen.text.slice(-7000),
    selectedCampaign,
    adSetEnabled,
    adSetSearchPresent: Boolean(adSetOpen?.inputs.some((x) => /search/i.test(x.placeholder || ''))),
    adSetSearchPlaceholders: adSetOpen?.inputs.map((x) => x.placeholder).filter(Boolean) ?? [],
    adSetVisibleText: adSetOpen?.text.slice(-6000) ?? null,
  };
}

async function inspectTikTokSafeZones() {
  await switchAccount('Bare Pets Philippines');
  const results = [];
  for (const id of [175, 176, 177, 178, 179, 180, 181, 182, 183]) {
    await page.goto(`${baseURL}/ads/tiktok/${id}/edit`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(850);
    const result = await page.evaluate(() => {
      const visible = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      };
      const safeEls = [...document.querySelectorAll('*')].filter((el) => visible(el) && /safe zone/i.test((el.textContent || '').trim()) && el.children.length < 4);
      return {
        title: document.querySelector('h1')?.textContent?.trim() ?? document.title,
        safeText: [...new Set(safeEls.map((el) => (el.textContent || '').trim().replace(/\s+/g, ' ')))].slice(0, 20),
        safeElements: safeEls.slice(0, 30).map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return { text: (el.textContent || '').trim().replace(/\s+/g, ' '), tag: el.tagName, x: r.x, y: r.y, width: r.width, height: r.height, border: s.border, background: s.backgroundColor, opacity: s.opacity, outer: el.outerHTML.slice(0, 1200) };
        }),
        images: [...document.images].filter(visible).map((img) => ({ alt: img.alt, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, src: img.currentSrc.slice(0, 300) })),
        bodyMentions: (document.body.innerText.match(/.{0,120}safe zone.{0,220}/gi) || []).slice(0, 10),
      };
    });
    result.id = id;
    results.push(result);
    if (id === 175 || id === 179 || id === 181) {
      await page.screenshot({ path: path.join(outputDir, `tiktok-${id}-safe-zone.png`), fullPage: true });
    }
  }
  return results;
}

async function inspectRedditApprovalMenu() {
  await switchAccount('Impremis Marketing Ad Account 03/01/2026');
  await page.goto(`${baseURL}/ads/reddit/132/edit`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(850);
  const formApproval = page.getByRole('button', { name: /Send to Internal Approval/i });
  const form = {
    present: (await formApproval.count()) > 0,
    disabled: (await formApproval.count()) > 0 ? await formApproval.isDisabled() : null,
    incompleteSignals: await page.locator('body').innerText().then((text) => (text.match(/required before launch|missing|required|invalid/gi) || []).slice(0, 30)),
  };
  await page.goto(`${baseURL}/ads/index/in-progress`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const menus = page.locator('button[aria-label="More status transitions"]');
  const menuCount = await menus.count();
  let opened = null;
  for (let i = 0; i < menuCount; i += 1) {
    const button = menus.nth(i);
    const card = button.locator('xpath=ancestor::div[contains(@class,"rounded-card")][1]');
    const cardText = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');
    if (/Pending Creative|Pending Ad Setup/i.test(cardText)) {
      await button.click();
      await page.waitForTimeout(300);
      opened = { cardText, diagnostics: await visibleDiagnostics() };
      await page.screenshot({ path: path.join(outputDir, 'reddit-incomplete-status-menu.png'), fullPage: true });
      break;
    }
  }
  return {
    form,
    menuCount,
    openedCardText: opened?.cardText ?? null,
    approvalOptions: opened?.diagnostics.buttons.filter((x) => /approval|complete fields|creative|setup/i.test(x.text)).slice(-30) ?? [],
    bodyTail: opened?.diagnostics.text.slice(-8000) ?? null,
  };
}

await fs.mkdir(outputDir, { recursive: true });
try {
  await login();
  const results = process.env.ADFUSE_FOCUSED_META_ONLY === '1'
    ? { generatedAt: new Date().toISOString(), metaSearch: await inspectMetaSearch() }
    : {
        generatedAt: new Date().toISOString(),
        metaSearch: await inspectMetaSearch(),
        tikTokSafeZones: await inspectTikTokSafeZones(),
        redditApproval: await inspectRedditApprovalMenu(),
      };
  await fs.writeFile(path.join(outputDir, 'focused-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
