import { Page } from '@playwright/test';
import { IssueTracker } from './issue-tracker';

type Context = {
  pageName: string;
  url: string;
  viewport: string;
  browser: string;
};

export async function runAccessibilityQuickChecks(page: Page, tracker: IssueTracker, context: Context): Promise<void> {
  const findings = await page.evaluate(() => {
    const issues: Array<{ component: string; summary: string; actual: string; severity: 'High' | 'Medium' | 'Low' }> = [];

    for (const image of [...document.images]) {
      if (!image.hasAttribute('alt')) {
        issues.push({ component: image.currentSrc || image.src, summary: 'Image missing alt text', actual: 'Image has no alt attribute.', severity: 'Medium' });
      }
    }

    for (const input of [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')]) {
      const id = input.id;
      const hasLabel = Boolean(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
      const hasAria = Boolean(input.getAttribute('aria-label') || input.getAttribute('aria-labelledby'));
      if (!hasLabel && !hasAria && input.type !== 'hidden') {
        issues.push({ component: input.name || input.id || input.tagName.toLowerCase(), summary: 'Form control missing accessible label', actual: 'Input has no label, aria-label, or aria-labelledby.', severity: 'High' });
      }
    }

    const ids = new Map<string, number>();
    for (const element of [...document.querySelectorAll<HTMLElement>('[id]')]) {
      ids.set(element.id, (ids.get(element.id) ?? 0) + 1);
    }
    for (const [id, count] of ids) {
      if (count > 1) {
        issues.push({ component: `#${id}`, summary: 'Duplicate ID detected', actual: `${count} elements use the same ID.`, severity: 'Medium' });
      }
    }

    for (const button of [...document.querySelectorAll<HTMLButtonElement>('button')]) {
      const name = button.innerText.trim() || button.getAttribute('aria-label') || button.title;
      if (!name) {
        issues.push({ component: 'button', summary: 'Empty button accessible name', actual: 'Button has no visible text or accessible label.', severity: 'High' });
      }
    }

    for (const link of [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]) {
      const name = link.innerText.trim() || link.getAttribute('aria-label') || link.title;
      if (!name) {
        issues.push({ component: link.href, summary: 'Empty link accessible name', actual: 'Link has no visible text or accessible label.', severity: 'High' });
      }
    }

    return issues;
  });

  for (const finding of findings) {
    tracker.add({
      page: context.pageName,
      url: context.url,
      area: 'Accessibility',
      component: finding.component,
      viewport: context.viewport,
      browser: context.browser,
      testType: 'Accessibility',
      severity: finding.severity,
      status: 'Failed',
      issueSummary: finding.summary,
      actualResult: finding.actual,
      expectedResult: 'Element should expose correct semantic and accessible information.',
      stepsToReproduce: `Open ${context.url} at ${context.viewport} and inspect accessibility attributes.`
    });
  }

  if (findings.length === 0) {
    tracker.pass(context.pageName);
  }
}
