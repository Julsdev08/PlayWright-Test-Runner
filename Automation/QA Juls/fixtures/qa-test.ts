import { test as base } from '@playwright/test';
import { IssueTracker } from '../utils/issue-tracker';
import { AccessGate } from '../components/AccessGate';
import { requireSafeBaseURL } from '../config/env';
import { SignupPage } from '../pages/SignupPage';
import { generatedSignupAccount, GeneratedSignupAccount } from '../utils/test-data';
import { validPassword } from '../data/signup-test-data';

export const tracker = new IssueTracker();

type QaFixtures = {
  safeBaseURL: string;
  accessGate: AccessGate;
  signupPage: SignupPage;
  signupAccount: GeneratedSignupAccount;
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
  },
  signupPage: async ({ page, accessGate }, use) => {
    await use(new SignupPage(page, accessGate));
  },
  signupAccount: async ({}, use) => {
    await use(generatedSignupAccount(validPassword));
  }
});

export { expect } from '@playwright/test';
