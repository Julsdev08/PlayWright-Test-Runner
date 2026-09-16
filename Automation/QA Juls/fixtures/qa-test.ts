import { test as base } from '@playwright/test';
import { IssueTracker } from '../utils/issue-tracker';
import { AccessGate } from '../components/AccessGate';
import { requireSafeBaseURL } from '../config/env';

export const tracker = new IssueTracker();

type QaFixtures = {
  safeBaseURL: string;
  accessGate: AccessGate;
};

export const test = base.extend<QaFixtures>({
  safeBaseURL: [
    async ({}, use) => {
      await use(requireSafeBaseURL());
    },
    { auto: true }
  ],
  accessGate: async ({ page, safeBaseURL }, use) => {
    const accessGate = new AccessGate(page, safeBaseURL);
    await accessGate.applyAccessCookies();
    await use(accessGate);
  }
});

export { expect } from '@playwright/test';
