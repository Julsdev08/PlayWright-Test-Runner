import { Page } from '@playwright/test';
import { performanceBudgets } from '../config/test.config';
import { IssueTracker } from './issue-tracker';

type Context = {
  pageName: string;
  url: string;
  viewport: string;
  browser: string;
};

export async function collectPerformanceMetrics(page: Page, tracker: IssueTracker, context: Context): Promise<void> {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? 0;
    const load = navigation ? navigation.loadEventEnd - navigation.startTime : 0;
    const lcpEntry = performance.getEntriesByType('largest-contentful-paint').at(-1);
    const lcp = lcpEntry?.startTime ?? 0;
    const layoutShiftEntries = performance.getEntriesByType('layout-shift') as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>;
    const cls = layoutShiftEntries
      .filter((entry) => !entry.hadRecentInput)
      .reduce((sum, entry) => sum + (entry.value ?? 0), 0);

    return { fcp, lcp, cls, load };
  });

  const checks = [
    { name: 'Initial page load', actual: metrics.load, budget: performanceBudgets.loadMs, unit: 'ms' },
    { name: 'First Contentful Paint', actual: metrics.fcp, budget: performanceBudgets.fcpMs, unit: 'ms' },
    { name: 'Largest Contentful Paint', actual: metrics.lcp, budget: performanceBudgets.lcpMs, unit: 'ms' },
    { name: 'Cumulative Layout Shift', actual: metrics.cls, budget: performanceBudgets.cls, unit: '' }
  ];

  for (const check of checks) {
    if (check.actual && check.actual > check.budget) {
      tracker.add({
        page: context.pageName,
        url: context.url,
        area: 'Performance',
        component: check.name,
        viewport: context.viewport,
        browser: context.browser,
        testType: 'Performance',
        severity: check.name === 'Cumulative Layout Shift' ? 'High' : 'Medium',
        status: 'Warning',
        issueSummary: `${check.name} exceeds budget`,
        actualResult: `${check.actual.toFixed(2)}${check.unit}`,
        expectedResult: `Should be <= ${check.budget}${check.unit}`,
        stepsToReproduce: `Open ${context.url} at ${context.viewport} and collect browser performance entries.`
      });
    }
  }

  tracker.pass(context.pageName);
}
