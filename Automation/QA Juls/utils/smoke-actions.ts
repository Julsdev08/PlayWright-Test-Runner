import { Page } from '@playwright/test';
import { PageConfig } from '../config/test.config';
import { IssueTracker } from './issue-tracker';

type Context = {
  pageName: string;
  url: string;
  viewport: string;
  browser: string;
};

export async function runFunctionalSmokeChecks(
  page: Page,
  pageConfig: PageConfig,
  tracker: IssueTracker,
  context: Context
): Promise<void> {
  await validateCriticalSelectors(page, pageConfig, tracker, context);
  await validateLinks(page, pageConfig.smoke?.navLinks ?? [], tracker, context);
  await validateButtons(page, pageConfig.smoke?.buttons ?? [], tracker, context);
  await validateForms(page, pageConfig.smoke?.forms ?? [], tracker, context);
  await validateComponents(page, pageConfig.smoke?.components ?? [], tracker, context);
}

async function validateCriticalSelectors(page: Page, pageConfig: PageConfig, tracker: IssueTracker, context: Context): Promise<void> {
  for (const selector of pageConfig.criticalSelectors ?? []) {
    const count = await page.locator(selector).count();
    if (count === 0) {
      tracker.add({
        ...baseIssue(context, selector),
        severity: 'Critical',
        issueSummary: 'Critical page area missing',
        actualResult: `${selector} was not found.`,
        expectedResult: `${selector} should exist on the page.`
      });
    } else {
      tracker.pass(context.pageName);
    }
  }
}

async function validateLinks(page: Page, selectors: string[], tracker: IssueTracker, context: Context): Promise<void> {
  for (const selector of selectors) {
    const links = await page.locator(selector).evaluateAll((elements) =>
      elements.slice(0, 50).map((element) => ({
        text: element.textContent?.trim() ?? '',
        href: (element as HTMLAnchorElement).href,
        target: (element as HTMLAnchorElement).target
      }))
    );

    for (const link of links) {
      if (!link.href) {
        tracker.add({
          ...baseIssue(context, selector),
          severity: 'High',
          issueSummary: 'Navigation link missing href',
          actualResult: `Link "${link.text}" does not have a valid href.`,
          expectedResult: 'Navigation links should point to valid internal or external URLs.'
        });
      }
    }
  }
}

async function validateButtons(page: Page, selectors: string[], tracker: IssueTracker, context: Context): Promise<void> {
  for (const selector of selectors) {
    const buttons = page.locator(selector);
    const count = await buttons.count();
    for (let index = 0; index < Math.min(count, 30); index += 1) {
      const button = buttons.nth(index);
      const box = await button.boundingBox();
      const disabled = await button.isDisabled().catch(() => false);
      if (!box || box.width < 24 || box.height < 24 || disabled) {
        tracker.add({
          ...baseIssue(context, selector),
          severity: 'Medium',
          issueSummary: 'Button may not be usable',
          actualResult: `Button index ${index} is disabled, hidden, or below recommended clickable size.`,
          expectedResult: 'Buttons should be visible, enabled, and large enough to click.'
        });
      }
    }
  }
}

async function validateForms(page: Page, selectors: string[], tracker: IssueTracker, context: Context): Promise<void> {
  for (const selector of selectors) {
    const forms = page.locator(selector);
    const count = await forms.count();
    for (let index = 0; index < count; index += 1) {
      const form = forms.nth(index);
      const requiredFields = await form.locator('input[required], textarea[required], select[required]').count();
      const submitButtons = await form.locator('button[type="submit"], input[type="submit"]').count();
      if (requiredFields > 0 && submitButtons === 0) {
        tracker.add({
          ...baseIssue(context, selector),
          severity: 'High',
          issueSummary: 'Form has required fields but no submit control',
          actualResult: `Form index ${index} contains ${requiredFields} required fields and no submit button.`,
          expectedResult: 'Forms should allow users to submit or continue.'
        });
      }
    }
  }
}

async function validateComponents(page: Page, selectors: string[], tracker: IssueTracker, context: Context): Promise<void> {
  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      tracker.pass(context.pageName);
    }
  }
}

function baseIssue(context: Context, component: string) {
  return {
    page: context.pageName,
    url: context.url,
    area: 'Functional Smoke',
    component,
    viewport: context.viewport,
    browser: context.browser,
    testType: 'Functional' as const,
    status: 'Failed' as const,
    stepsToReproduce: `Open ${context.url} at ${context.viewport} and inspect ${component}.`
  };
}
