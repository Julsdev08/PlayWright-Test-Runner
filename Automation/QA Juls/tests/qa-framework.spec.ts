import path from 'path';
import { pages, viewports, visualComparison } from '../config/test.config';
import { GenericPage } from '../pages/GenericPage';
import { test, tracker } from '../fixtures/qa-test';
import { runAccessibilityQuickChecks } from '../utils/accessibility-checks';
import { attachBrowserMonitors } from '../utils/browser-monitors';
import { writeExcelReport } from '../utils/excel-report';
import { runImageValidation } from '../utils/image-validation';
import { collectPerformanceMetrics } from '../utils/performance-checks';
import { runResponsiveChecks } from '../utils/responsive-checks';
import { runFunctionalSmokeChecks } from '../utils/smoke-actions';
import { printTerminalSummary } from '../utils/terminal-summary';
import { comparePageToReference } from '../utils/visual-comparison';

test.afterAll(async () => {
  const reportPath = await writeExcelReport(tracker.all());
  printTerminalSummary(tracker.summary());
  console.log(`Excel Report: ${reportPath}`);
});

for (const pageConfig of pages) {
  for (const viewport of viewports) {
    test(`${pageConfig.name} QA audit - ${viewport.name}`, async ({ page, browserName }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await applyAccessCookie(page);

      const monitor = attachBrowserMonitors(page);
      const sitePage = new GenericPage(page);
      await sitePage.goto(pageConfig.path);
      await unlockAccessGate(page);

      const context = {
        pageName: pageConfig.name,
        url: sitePage.currentUrl(),
        viewport: `${viewport.name} (${viewport.width}x${viewport.height})`,
        browser: browserName
      };

      const visualResult = await comparePageToReference(
        page,
        resolveReference(pageConfig.figmaReference, viewport.name),
        pageConfig.name,
        viewport.name
      );

      if (visualResult.skipped) {
        tracker.add({
          page: context.pageName,
          url: context.url,
          area: 'Visual Comparison',
          component: 'Figma Reference',
          viewport: context.viewport,
          browser: context.browser,
          testType: 'Visual',
          severity: 'Low',
          status: 'Warning',
          issueSummary: 'Visual comparison skipped',
          actualResult: visualResult.reason ?? 'Reference was not available.',
          expectedResult: 'A Figma reference screenshot should be available for comparison.',
          stepsToReproduce: `Add the Figma reference image under visual/baselines and rerun ${pageConfig.name}.`
        });
      } else if (visualResult.diffRatio > visualComparison.maxDiffRatio) {
        tracker.add({
          page: context.pageName,
          url: context.url,
          area: 'Visual Comparison',
          component: 'Full page screenshot',
          viewport: context.viewport,
          browser: context.browser,
          testType: 'Visual',
          severity: visualResult.diffRatio > 0.1 ? 'High' : 'Medium',
          status: 'Failed',
          issueSummary: 'Staging page differs from Figma reference',
          actualResult: `Diff ratio ${(visualResult.diffRatio * 100).toFixed(2)}%. Actual: ${visualResult.actualPath}. Diff: ${visualResult.diffPath}. ${visualResult.reason ?? ''}`,
          expectedResult: `Diff ratio should be <= ${(visualComparison.maxDiffRatio * 100).toFixed(2)}%.`,
          stepsToReproduce: `Open ${context.url} at ${context.viewport}, capture screenshot, and compare with Figma reference.`
        });
      } else {
        tracker.pass(context.pageName);
      }

      await runResponsiveChecks(page, tracker, context);
      await runImageValidation(page, tracker, context);
      await runFunctionalSmokeChecks(page, pageConfig, tracker, context);
      await runAccessibilityQuickChecks(page, tracker, context);
      await collectPerformanceMetrics(page, tracker, context);

      for (const consoleError of monitor.consoleErrors) {
        tracker.add({
          page: context.pageName,
          url: context.url,
          area: 'Browser Console',
          component: consoleError.location,
          viewport: context.viewport,
          browser: context.browser,
          testType: 'Console',
          severity: 'High',
          status: 'Failed',
          issueSummary: 'Browser console error detected',
          actualResult: consoleError.text,
          expectedResult: 'The page should not emit JavaScript console errors.',
          stepsToReproduce: `Open ${context.url} at ${context.viewport} and observe the browser console.`,
          consoleError: consoleError.text
        });
      }

      for (const networkError of monitor.networkErrors) {
        tracker.add({
          page: context.pageName,
          url: context.url,
          area: 'Network',
          component: networkError.url,
          viewport: context.viewport,
          browser: context.browser,
          testType: 'Network',
          severity: networkError.status && networkError.status >= 500 ? 'Critical' : 'High',
          status: 'Failed',
          issueSummary: 'Failed network request detected',
          actualResult: networkError.error ?? `HTTP ${networkError.status}`,
          expectedResult: 'All critical assets and API requests should complete successfully.',
          stepsToReproduce: `Open ${context.url} at ${context.viewport} and inspect network requests.`,
          networkError: `${networkError.method ?? 'GET'} ${networkError.url} ${networkError.status ?? networkError.error ?? ''}`
        });
      }

      monitor.stop();
    });
  }
}

function resolveReference(referencePath: string | undefined, viewportName: string): string | undefined {
  if (!referencePath) return undefined;
  const parsed = path.parse(referencePath);
  const viewportSpecific = path.join(parsed.dir, `${parsed.name.replace(/desktop-1440$/, viewportName)}${parsed.ext}`);
  return viewportSpecific;
}

async function applyAccessCookie(page: import('@playwright/test').Page): Promise<void> {
  const accessCode = process.env.ACCESS_CODE ?? process.env.QA_COOKIE_VALUE;
  if (!accessCode) return;

  const url = new URL(process.env.STAGING_BASE_URL ?? 'https://example.com');
  const names = (process.env.QA_COOKIE_NAMES ?? 'access_code,access,password,preview,bypass,site_password,rv_access,rentvouchers_access')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  await page.context().addCookies(
    names.map((name) => ({
      name,
      value: accessCode,
      domain: url.hostname,
      path: '/',
      httpOnly: false,
      secure: url.protocol === 'https:',
      sameSite: 'Lax' as const
    }))
  );
}

async function unlockAccessGate(page: import('@playwright/test').Page): Promise<void> {
  const accessCode = process.env.ACCESS_CODE ?? process.env.QA_COOKIE_VALUE;
  if (!accessCode) return;

  const passwordInput = page.locator('input[type="password"]').first();
  if ((await passwordInput.count()) === 0) return;

  await passwordInput.fill(accessCode, { force: true });
  await passwordInput.press('Enter', { timeout: 3_000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
}
