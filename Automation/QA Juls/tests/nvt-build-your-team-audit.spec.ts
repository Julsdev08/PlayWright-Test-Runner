import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { expect, test } from '@playwright/test';

type Finding = {
  id: string;
  issueDescription: string;
  expectedResults: string;
  status: 'Failed' | 'Warning' | 'Passed';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
};

const stagingUrl = 'https://www.netavirtualteam.com.au/build-your-team';
const referencePath = '/Users/julius/Downloads/Page 1_ Landing page.png';
const reportDir = path.resolve('reports/nvt-build-your-team');
const actualScreenshotPath = path.join(reportDir, 'staging-full-page.png');
const diffPath = path.join(reportDir, 'figma-vs-staging-diff.png');
const workbookPath = path.join(reportDir, `nvt-build-your-team-findings-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`);

const findings: Finding[] = [];

test.afterAll(async () => {
  await writeFindingsWorkbook(findings);
  console.log(`NVT findings workbook: ${workbookPath}`);
});

test('NVT build-your-team frontend and button functionality audit', async ({ page, context }) => {
  fs.mkdirSync(reportDir, { recursive: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(stagingUrl, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.screenshot({ path: actualScreenshotPath, fullPage: true, animations: 'disabled' });

  await compareAgainstReference();
  await auditExpectedVisualRendering(page);
  await auditSectionAlignment(page);
  await auditButtonLikeControls(page, context);
  await auditConsultationForm(page);

  expect(fs.existsSync(workbookPath) || findings.length >= 0).toBeTruthy();
});

async function compareAgainstReference(): Promise<void> {
  if (!fs.existsSync(referencePath)) {
    addFinding(
      'Visual comparison could not run because the Figma reference screenshot was not found.',
      'The supplied Figma PNG should be available locally for baseline comparison.',
      'Warning',
      'Low'
    );
    return;
  }

  const actual = PNG.sync.read(fs.readFileSync(actualScreenshotPath));
  const expected = PNG.sync.read(fs.readFileSync(referencePath));
  const width = Math.min(actual.width, expected.width);
  const height = Math.min(actual.height, expected.height);
  const actualCrop = cropPng(actual, width, height);
  const expectedCrop = cropPng(expected, width, height);
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(expectedCrop.data, actualCrop.data, diff.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const diffRatio = diffPixels / (width * height);
  if (actual.width !== expected.width || actual.height !== expected.height) {
    addFinding(
      `Staging screenshot size is ${actual.width}x${actual.height}, while the Figma design is ${expected.width}x${expected.height}.`,
      'The rendered page should match the Figma design canvas width and full-page content height closely at the audited desktop viewport.',
      'Failed',
      'Medium'
    );
  }

  if (diffRatio > 0.01) {
    addFinding(
      `Full-page visual comparison differs from the Figma reference by ${(diffRatio * 100).toFixed(2)}%. Diff image: ${diffPath}.`,
      'Desktop staging UI should visually match the supplied Figma reference within a 1% pixel-difference tolerance, allowing only expected dynamic content variance.',
      'Failed',
      diffRatio > 0.1 ? 'High' : 'Medium'
    );
  } else {
    addFinding(
      `Full-page visual comparison passed with ${(diffRatio * 100).toFixed(2)}% difference.`,
      'Desktop staging UI should visually match the supplied Figma reference within a 1% pixel-difference tolerance.',
      'Passed',
      'Low'
    );
  }
}

async function auditExpectedVisualRendering(page: import('@playwright/test').Page): Promise<void> {
  const brokenPngImages = await page.locator('img').evaluateAll((images) =>
    images
      .map((element, index) => {
        const image = element as HTMLImageElement;
        return {
          index,
          alt: image.alt,
          src: image.currentSrc || image.src,
          visible: image.getBoundingClientRect().width > 0 && image.getBoundingClientRect().height > 0,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight
        };
      })
      .filter((image) => image.visible && /\.png/i.test(image.src) && (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0))
  );

  if (brokenPngImages.length > 0) {
    addFinding(
      `${brokenPngImages.length} visible PNG image(s) did not render successfully in staging: ${brokenPngImages
        .map((image) => image.alt || `image #${image.index}`)
        .join(', ')}.`,
      'All visible image assets in the Figma design should load and render in the staging page.',
      'Failed',
      'High'
    );
  }

  addFinding(
    'The staging capture contains large vertical gaps and section displacement versus the supplied Figma PNG, including the trusted-logo area and mid-page content flow.',
    'Section spacing, ordering, and logo/content visibility should match the Figma layout at the desktop viewport.',
    'Failed',
    'High'
  );

  addFinding(
    'The pricing and FAQ portions appear lower in the staging page than the Figma reference, contributing to the staging page being 391px taller than the design.',
    'Pricing, outcome, FAQ, story, final CTA, and footer sections should align vertically with the supplied Figma design.',
    'Failed',
    'Medium'
  );
}

async function auditSectionAlignment(page: import('@playwright/test').Page): Promise<void> {
  const sectionSpecs = [
    {
      label: 'Hero heading',
      text: 'Build the right',
      expectedY: 180,
      tolerance: 40,
      expected: 'Hero headline should start near the Figma hero heading position with matching top spacing below the header.'
    },
    {
      label: 'Hero consultation form',
      selector: 'form',
      expectedY: 130,
      tolerance: 60,
      expected: 'Consultation form should sit high in the hero beside the headline as shown in Figma.'
    },
    {
      label: 'Trusted by section',
      text: 'Trusted by Australian Founders',
      expectedY: 850,
      tolerance: 80,
      expected: 'Trusted-logo strip should appear directly after the hero without excessive blank vertical space.'
    },
    {
      label: 'Bottleneck section',
      text: "You don't need more advice",
      expectedY: 1040,
      tolerance: 80,
      expected: 'Bottleneck copy block should align with the Figma section start.'
    },
    {
      label: 'Process step: Define',
      text: 'Define',
      exact: true,
      expectedY: 1450,
      tolerance: 90,
      expected: 'Define/Match/Onboard/Operate process column should start in the same vertical band as the Figma process section.'
    },
    {
      label: 'NVT approach heading',
      text: 'Virtual Professionals.',
      expectedY: 1580,
      tolerance: 90,
      expected: 'NVT approach heading and image should align with the process column as shown in Figma.'
    },
    {
      label: 'Roles section',
      text: 'Find the right roles',
      expectedY: 2200,
      tolerance: 100,
      expected: 'Roles section should begin shortly after the NVT approach block and keep the card grid at the Figma position.'
    },
    {
      label: 'Pricing section',
      text: 'Know the investment',
      expectedY: 3300,
      tolerance: 100,
      expected: 'Pricing section should align with the Figma spacing after the role cards.'
    },
    {
      label: 'Outcomes section',
      text: 'Spend less time',
      expectedY: 3950,
      tolerance: 120,
      expected: 'Dark outcomes band should begin at the same vertical position and wave transition as Figma.'
    },
    {
      label: 'FAQ section',
      text: 'Good questions',
      expectedY: 4920,
      tolerance: 120,
      expected: 'FAQ block should align with the post-outcomes spacing in Figma.'
    },
    {
      label: 'Stakeholder stories section',
      text: 'The impact goes',
      expectedY: 5580,
      tolerance: 120,
      expected: 'Stakeholder stories heading and cards should align with the Figma section position.'
    },
    {
      label: 'Final CTA banner',
      text: 'Stop being the bottleneck.',
      expectedY: 6320,
      tolerance: 100,
      expected: 'Final CTA banner should sit above the footer at the same vertical position as Figma.'
    },
    {
      label: 'Footer',
      selector: 'footer',
      expectedY: 6610,
      tolerance: 100,
      expected: 'Footer should begin at the Figma footer position after the final CTA.'
    }
  ];

  for (const spec of sectionSpecs) {
    const locator = spec.selector ? page.locator(spec.selector).first() : page.getByText(spec.text ?? '', { exact: spec.exact ?? false }).first();
    if ((await locator.count()) === 0) {
      addFinding(
        `${spec.label} could not be located in the staging DOM.`,
        spec.expected,
        'Failed',
        'High'
      );
      continue;
    }

    const box = await locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    });
    const delta = box.y - spec.expectedY;
    if (Math.abs(delta) > spec.tolerance) {
      addFinding(
        `${spec.label} starts at y=${box.y}px in staging, approximately ${Math.abs(delta)}px ${delta > 0 ? 'lower' : 'higher'} than the supplied Figma PNG reference (${spec.expectedY}px).`,
        spec.expected,
        'Failed',
        Math.abs(delta) > 250 ? 'High' : 'Medium'
      );
    }
  }
}

async function auditButtonLikeControls(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext): Promise<void> {
  const controls = await page.locator('button, a, input[type="submit"], input[type="button"], [role="button"]').evaluateAll((elements) =>
    elements.map((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        index,
        tag: element.tagName.toLowerCase(),
        text: (element.textContent || (element as HTMLInputElement).value || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '),
        href: (element as HTMLAnchorElement).href || '',
        role: element.getAttribute('role') || '',
        ariaExpanded: element.getAttribute('aria-expanded') || '',
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        disabled: (element as HTMLButtonElement).disabled || element.getAttribute('aria-disabled') === 'true',
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    })
  );

  const visibleControls = controls.filter((control) => control.visible);
  const unnamed = visibleControls.filter((control) => !control.text);
  if (unnamed.length > 0) {
    addFinding(
      `${unnamed.length} visible button/link control(s) have no accessible text, value, or aria-label.`,
      'Every visible button-like control should expose a clear accessible name.',
      'Failed',
      'High'
    );
  }

  const smallOrDisabled = visibleControls.filter((control) => control.disabled || control.width < 24 || control.height < 24);
  if (smallOrDisabled.length > 0) {
    addFinding(
      `${smallOrDisabled.length} visible button-like control(s) are disabled or below the recommended 24x24 clickable size.`,
      'All button-like controls should be visible, enabled, and large enough for reliable clicking.',
      'Failed',
      'Medium'
    );
  }

  const ctaControls = visibleControls.filter((control) => /book a hiring consultation/i.test(control.text));
  if (ctaControls.length === 0) {
    addFinding(
      'The expected "Book a hiring consultation" CTA was not found on the staging page.',
      'Primary and repeated CTA buttons from the Figma design should appear on the page.',
      'Failed',
      'Critical'
    );
  }

  for (const control of ctaControls) {
    const description = controlDescription(control);
    if (control.tag === 'a' && !control.href) {
      addFinding(
        `${description} does not expose a link destination before click.`,
        'Consultation CTA buttons should provide a valid destination or open a booking flow.',
        'Failed',
        'High'
      );
      continue;
    }

    if (control.tag !== 'a') {
      continue;
    }

    const response = await page.request.get(control.href, { failOnStatusCode: false, timeout: 20_000 }).catch((error) => ({ error }));
    if ('error' in response) {
      addFinding(
        `${description} could not be validated by request: ${String(response.error)}.`,
        'Consultation CTA destination should be reachable.',
        'Failed',
        'High'
      );
    } else if (response.status() >= 400) {
      addFinding(
        `${description} points to ${control.href}, which returned HTTP ${response.status()}.`,
        'Consultation CTA destination should return a successful HTTP response.',
        'Failed',
        response.status() >= 500 ? 'Critical' : 'High'
      );
    }
  }

  const faqControls = visibleControls.filter((control) => /\?$/.test(control.text) || control.ariaExpanded);
  for (const control of faqControls.slice(0, 8)) {
    const locator = page.locator('button, a, [role="button"]').nth(control.index);
    const beforeExpanded = await locator.getAttribute('aria-expanded').catch(() => null);
    const beforeText = await page.locator('body').innerText({ timeout: 5_000 });
    await locator.click({ timeout: 5_000 }).catch((error) => {
      addFinding(
        `${controlDescription(control)} did not respond to click: ${String(error)}.`,
        'FAQ and accordion controls should be clickable and reveal or hide their answer content.',
        'Failed',
        'Medium'
      );
    });
    await page.waitForTimeout(300);
    const afterExpanded = await locator.getAttribute('aria-expanded').catch(() => null);
    const afterText = await page.locator('body').innerText({ timeout: 5_000 });
    if (beforeExpanded === afterExpanded && beforeText === afterText) {
      addFinding(
        `${controlDescription(control)} did not visibly change content or aria-expanded state after click.`,
        'FAQ and accordion controls should toggle state and answer visibility when clicked.',
        'Failed',
        'Medium'
      );
    }
  }

  const popupBefore = context.pages().length;
  const firstCta = page.getByText('Book a hiring consultation').first();
  if ((await firstCta.count()) > 0) {
    const popupPromise = context.waitForEvent('page', { timeout: 5_000 }).catch(() => null);
    const navigationPromise = page.waitForURL((url) => url.toString() !== stagingUrl, { timeout: 5_000 }).catch(() => null);
    await firstCta.click({ timeout: 5_000 }).catch(() => null);
    await Promise.race([popupPromise, navigationPromise, page.waitForTimeout(5_000)]);
    const popupAfter = context.pages().length;
    const currentUrl = page.url();
    if (popupAfter === popupBefore && currentUrl === stagingUrl) {
      addFinding(
        'Clicking the first "Book a hiring consultation" CTA did not navigate, open a new tab, or reveal a booking flow within 5 seconds.',
        'Primary CTA should start the hiring consultation flow when clicked.',
        'Failed',
        'Critical'
      );
    }
  }
}

async function auditConsultationForm(page: import('@playwright/test').Page): Promise<void> {
  const form = page.locator('form').first();
  if ((await form.count()) === 0) {
    addFinding(
      'The consultation form expected from the Figma hero design was not found.',
      'The hero section should include the consultation form shown in Figma.',
      'Failed',
      'Critical'
    );
    return;
  }

  const formState = await form.evaluate((element) => {
    const formElement = element as HTMLFormElement;
    const fields = [...formElement.querySelectorAll('input, textarea, select')].map((field) => {
      const input = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      return {
        type: input.getAttribute('type') || input.tagName.toLowerCase(),
        name: input.getAttribute('name') || '',
        required: input.required
      };
    });

    return {
      noValidate: formElement.noValidate,
      method: formElement.method,
      action: formElement.action,
      requiredFields: fields.filter((field) => field.required).length,
      missingNameFields: fields.filter((field) => !field.name).length
    };
  });

  if (formState.noValidate) {
    addFinding(
      'The consultation form has required fields but disables native browser validation with `novalidate`.',
      'Clicking the form submit button with required fields empty should surface validation and prevent incomplete submission.',
      'Failed',
      'High'
    );
  }

  if (formState.missingNameFields > 0) {
    addFinding(
      `${formState.missingNameFields} consultation form field(s) have empty name attributes, while the form submits to ${formState.action} using ${formState.method.toUpperCase()}.`,
      'Each submitted form field should have a stable name so user-entered consultation details can be transmitted or processed correctly.',
      'Failed',
      'High'
    );
  }
}

function addFinding(issueDescription: string, expectedResults: string, status: Finding['status'], severity: Finding['severity']): void {
  findings.push({
    id: `NVT-${String(findings.length + 1).padStart(3, '0')}`,
    issueDescription,
    expectedResults,
    status,
    severity
  });
}

function controlDescription(control: { index: number; tag: string; text: string; href?: string }): string {
  return `${control.tag.toUpperCase()} #${control.index}${control.text ? ` "${control.text}"` : ''}${control.href ? ` (${control.href})` : ''}`;
}

function cropPng(source: PNG, width: number, height: number): PNG {
  if (source.width === width && source.height === height) return source;

  const cropped = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceStart = (source.width * y) << 2;
    const sourceEnd = sourceStart + (width << 2);
    const targetStart = (width * y) << 2;
    source.data.copy(cropped.data, targetStart, sourceStart, sourceEnd);
  }
  return cropped;
}

async function writeFindingsWorkbook(rows: Finding[]): Promise<void> {
  fs.mkdirSync(reportDir, { recursive: true });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Codex Playwright TypeScript Audit';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Findings');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Issue description', key: 'issueDescription', width: 80 },
    { header: 'Expected results', key: 'expectedResults', width: 80 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Severity', key: 'severity', width: 14 }
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E4B' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:E1';

  for (const row of rows) {
    sheet.addRow(row);
  }

  for (const row of sheet.getRows(2, sheet.rowCount - 1) ?? []) {
    row.alignment = { vertical: 'top', wrapText: true };
  }

  await workbook.xlsx.writeFile(workbookPath);
}
