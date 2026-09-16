import { Page } from '@playwright/test';
import { IssueTracker } from './issue-tracker';

type Context = {
  pageName: string;
  url: string;
  viewport: string;
  browser: string;
};

export async function runResponsiveChecks(page: Page, tracker: IssueTracker, context: Context): Promise<void> {
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (horizontalOverflow) {
    tracker.add({
      ...baseIssue(context),
      testType: 'Responsive',
      severity: 'High',
      issueSummary: 'Page has horizontal scrolling',
      actualResult: 'Document width exceeds viewport width.',
      expectedResult: 'Page should fit the viewport without horizontal scrolling.'
    });
  } else {
    tracker.pass(context.pageName);
  }

  const clippedOrOverlapping = await page.evaluate(() => {
    const elements = [...document.body.querySelectorAll<HTMLElement>('body *')].slice(0, 500);
    const viewportWidth = window.innerWidth;
    const viewportHeight = Math.max(window.innerHeight, document.documentElement.scrollHeight);
    const issues: string[] = [];

    for (const element of elements) {
      const style = window.getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.right > viewportWidth + 2 || rect.left < -2 || rect.bottom > viewportHeight + 2) {
        issues.push(element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''));
      }
    }

    return issues.slice(0, 10);
  });

  if (clippedOrOverlapping.length > 0) {
    tracker.add({
      ...baseIssue(context),
      testType: 'Responsive',
      severity: 'High',
      issueSummary: 'Elements appear clipped or outside the viewport',
      actualResult: `Potential viewport issues: ${clippedOrOverlapping.join(', ')}`,
      expectedResult: 'Visible elements should remain within the viewport and page bounds.'
    });
  } else {
    tracker.pass(context.pageName);
  }
}

function baseIssue(context: Context) {
  return {
    page: context.pageName,
    url: context.url,
    area: 'Responsive Layout',
    component: 'Viewport',
    viewport: context.viewport,
    browser: context.browser,
    status: 'Failed' as const,
    stepsToReproduce: `Open ${context.url} at ${context.viewport} and inspect layout boundaries.`
  };
}
