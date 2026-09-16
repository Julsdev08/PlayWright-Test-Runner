import { Page, TestInfo } from '@playwright/test';
import { expect, test } from '../../fixtures/qa-test';
import { assertStagingOnly, ecommerceConfig } from '../../config/ecommerce.config';
import { signupScenarios } from '../../data/ecommerce-scenarios';
import { SignupPage } from '../../pages/SignupPage';
import { recordScenarioResult, writeEcommerceReports } from '../../utils/ecommerce-report';
import { applyAccessCookies } from '../../utils/access-cookie';

const scenarioById = new Map(signupScenarios.map((scenario) => [scenario.id, scenario]));

function scenario(id: string) {
  const item = scenarioById.get(id);
  if (!item) {
    throw new Error(`Missing signup scenario ${id}`);
  }
  return item;
}

type SignupEmailTestBody = (fixtures: { page: Page }, testInfo: TestInfo) => Promise<void> | void;

function scenarioTest(id: string, title: string, body: SignupEmailTestBody): void {
  const item = scenario(id);
  test(`${item.id} ${title}`, async ({ page }, testInfo) => body({ page }, testInfo));
}

test.describe('Ecommerce signup email verification', () => {
  test.beforeEach(async ({ context }) => {
    assertStagingOnly();
    await applyAccessCookies(context);
    test.skip(!ecommerceConfig.allowEmailVerificationTests, 'Set ENABLE_TEST_INBOX=true and configure a test inbox before running email tests.');
  });

  test.afterEach(async ({}, testInfo) => {
    const id = testInfo.title.match(/SIGNUP-\d{3}/)?.[0];
    if (id) {
      recordScenarioResult(scenario(id), testInfo, 'Email-dependent scenario requires configured inbox/backend assertions.');
    }
  });

  test.afterAll(async () => {
    await writeEcommerceReports();
  });

  scenarioTest('SIGNUP-008', 'email verification', async ({ page }) => {
    test.fail(true, 'Wire this to the approved staging test inbox or backend email API.');

    await page.goto(process.env.TEST_VERIFICATION_LINK ?? '/');
    await expect(page.getByText(/verified|success|complete|account/i).first()).toBeVisible();
  });

  scenarioTest('SIGNUP-009', 'resend verification', async ({ page }) => {
    test.fail(true, 'Wire this to an unverified QA account and approved staging test inbox.');

    const signup = new SignupPage(page);
    await signup.gotoSignup();
    await signup.resendVerificationButton().click();
    await expect(page.getByText(/sent|resent|check your email/i).first()).toBeVisible();
  });

  scenarioTest('SIGNUP-010', 'expired and invalid verification links', async ({ page }) => {
    const expiredLink = process.env.TEST_EXPIRED_VERIFICATION_LINK;
    const invalidLink = process.env.TEST_INVALID_VERIFICATION_LINK;
    test.skip(!expiredLink || !invalidLink, 'Set TEST_EXPIRED_VERIFICATION_LINK and TEST_INVALID_VERIFICATION_LINK.');

    for (const link of [expiredLink, invalidLink]) {
      await page.goto(link!);
      await expect(page.getByText(/expired|invalid|try again|resend|verification/i).first()).toBeVisible();
    }
  });
});
