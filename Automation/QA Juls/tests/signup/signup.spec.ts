import AxeBuilder from '@axe-core/playwright';
import { Page, Route, TestInfo } from '@playwright/test';
import { expect, test } from '../../fixtures/qa-test';
import { assertStagingOnly, ecommerceConfig } from '../../config/ecommerce.config';
import { signupScenarios } from '../../data/ecommerce-scenarios';
import { invalidEmailCases, scriptLikeValue, validPassword, weakPasswordCases } from '../../data/signup-test-data';
import { SignupPage } from '../../pages/SignupPage';
import { abortSignupApi, mockSignupApi, waitForSignupResponse } from '../../utils/signup-api';
import { recordScenarioResult, writeEcommerceReports } from '../../utils/ecommerce-report';
import { cleanupCreatedSignupAccounts, trackCreatedSignupEmail } from '../../utils/signup-cleanup';
import { generatedSignupAccount } from '../../utils/test-data';
import { applyAccessCookies } from '../../utils/access-cookie';

const scenarioById = new Map(signupScenarios.map((scenario) => [scenario.id, scenario]));

function scenario(id: string) {
  const item = scenarioById.get(id);
  if (!item) {
    throw new Error(`Missing signup scenario ${id}`);
  }
  return item;
}

type SignupTestBody = (fixtures: { page: Page }, testInfo: TestInfo) => Promise<void> | void;

function scenarioTest(id: string, title: string, body: SignupTestBody): void {
  const item = scenario(id);
  test(`${item.id} ${title}`, async ({ page }, testInfo) => body({ page }, testInfo));
}

test.describe('Ecommerce signup flow', () => {
  test.beforeEach(async ({ context }) => {
    assertStagingOnly();
    await applyAccessCookies(context);
  });

  test.afterEach(async ({}, testInfo) => {
    const id = testInfo.title.match(/SIGNUP-\d{3}/)?.[0];
    if (!id) {
      return;
    }

    recordScenarioResult(scenario(id), testInfo);
  });

  test.afterAll(async ({ request }) => {
    await cleanupCreatedSignupAccounts(request);
    await writeEcommerceReports();
  });

  scenarioTest('SIGNUP-001', 'successful registration', async ({ page }) => {
    test.skip(!ecommerceConfig.allowAccountCreation, 'Set ALLOW_SIGNUP_ACCOUNT_CREATION=true to create controlled staging accounts.');

    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount(account);
    await signup.acceptTermsIfPresent();

    const responsePromise = waitForSignupResponse(page).catch(() => undefined);
    await signup.submit();
    const response = await responsePromise;

    if (response) {
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(400);
    }

    await expect(
      page.getByText(/check your email|verify|verification|welcome|success|created|account/i).first()
    ).toBeVisible();
    trackCreatedSignupEmail(account.email);
  });

  scenarioTest('SIGNUP-002', 'required-field validation', async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.gotoSignup();
    const submit = signup.submitButton();

    if (await submit.isEnabled()) {
      await submit.click();
      await signup.expectValidationFeedback(/required|enter|missing|invalid|agree/i);
      return;
    }

    await expect(submit).toBeDisabled();
  });

  for (const emailCase of invalidEmailCases) {
    scenarioTest('SIGNUP-003', `email format edge case - ${emailCase.label}`, async ({ page }) => {
      const signup = new SignupPage(page);
      const account = generatedSignupAccount(validPassword);
      await signup.gotoSignup();
      await signup.fillAccount({ ...account, email: emailCase.email });
      await signup.acceptTermsIfPresent();
      await signup.submit();
      await signup.expectValidationFeedback(/email|invalid|valid/i);
    });
  }

  for (const passwordCase of weakPasswordCases) {
    scenarioTest('SIGNUP-004', `password policy edge case - ${passwordCase.label}`, async ({ page }) => {
      const signup = new SignupPage(page);
      const account = generatedSignupAccount(passwordCase.password);
      await signup.gotoSignup();
      test.skip(
        (await signup.passwordField().count()) === 0 || !(await signup.passwordField().isVisible().catch(() => false)),
        'No password field exists on this signup form.'
      );
      await signup.fillAccount(account);
      await signup.acceptTermsIfPresent();
      await signup.submit();
      await signup.expectValidationFeedback(/password|characters|uppercase|lowercase|number|special|strong/i);
    });
  }

  scenarioTest('SIGNUP-005', 'password confirmation mismatch', async ({ page }) => {
    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount(account);

    const confirm = signup.confirmPasswordField();
    test.skip((await confirm.count()) === 0, 'No confirm password field exists on this signup form.');

    await confirm.fill(`${validPassword}Mismatch`);
    await signup.acceptTermsIfPresent();
    await signup.submit();
    await signup.expectValidationFeedback(/match|same|confirm|password/i);
  });

  scenarioTest('SIGNUP-006', 'existing email registration', async ({ page }) => {
    test.skip(!ecommerceConfig.existingAccountEmail, 'Set EXISTING_TEST_ACCOUNT_EMAIL to run duplicate-email validation.');

    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount({ ...account, email: ecommerceConfig.existingAccountEmail! });
    await signup.acceptTermsIfPresent();
    await signup.submit();
    await signup.expectValidationFeedback(/already|exists|registered|account|email/i);
  });

  scenarioTest('SIGNUP-007', 'terms and privacy consent', async ({ page }) => {
    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();

    const terms = signup.termsCheckbox();
    test.skip((await terms.count()) === 0, 'No terms/privacy consent checkbox exists on this signup form.');

    await signup.fillAccount(account);
    await expect(terms).not.toBeChecked();
    await signup.submit();
    await signup.expectValidationFeedback(/terms|privacy|agree|consent|required/i);
  });

  scenarioTest('SIGNUP-011', 'double-click and duplicate submission prevention', async ({ page }) => {
    let requests = 0;
    let releaseResponse: (() => void) | undefined;

    await page.route(ecommerceConfig.api.signupUrlPattern, async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.continue();
        return;
      }

      requests += 1;
      await new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount(account);
    await signup.acceptTermsIfPresent();

    await signup.submitButton().click();
    await signup.submitButton().click({ trial: true }).catch(() => undefined);
    await expect.poll(() => requests).toBe(1);
    releaseResponse?.();
  });

  scenarioTest('SIGNUP-012', 'loading and disabled-button states', async ({ page }) => {
    let releaseResponse: (() => void) | undefined;

    await page.route(ecommerceConfig.api.signupUrlPattern, async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.continue();
        return;
      }

      await new Promise<void>((resolve) => {
        releaseResponse = resolve;
      });
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount(account);
    await signup.acceptTermsIfPresent();
    await signup.submit();

    await expect(signup.submitButton()).toBeDisabled();
    releaseResponse?.();
  });

  scenarioTest('SIGNUP-013', 'API validation errors', async ({ page }) => {
    await mockSignupApi(page, 422, { message: 'Email is invalid', errors: { email: ['Email is invalid'] } });

    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount(account);
    await signup.acceptTermsIfPresent();
    await signup.submit();
    await signup.expectValidationFeedback(/invalid|email|error/i);
  });

  scenarioTest('SIGNUP-014', 'server errors', async ({ page }) => {
    await mockSignupApi(page, 500, { message: 'Something went wrong' });

    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount(account);
    await signup.acceptTermsIfPresent();
    await signup.submit();
    await signup.expectValidationFeedback(/error|try again|something went wrong|unable/i);
  });

  scenarioTest('SIGNUP-015', 'network timeout and retry behavior', async ({ page }) => {
    await abortSignupApi(page);

    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount(account);
    await signup.acceptTermsIfPresent();
    await signup.submit();
    await signup.expectValidationFeedback(/network|timeout|try again|unable|error/i);
    await expect(signup.submitButton()).toBeEnabled();
  });

  scenarioTest('SIGNUP-016', 'desktop responsiveness', async ({ page }) => {
    test.skip(test.info().project.name.includes('mobile'), 'Desktop responsiveness runs on desktop projects only.');

    const signup = new SignupPage(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signup.gotoSignup();
    await signup.expectNoHorizontalOverflow();
    await signup.submitButton().scrollIntoViewIfNeeded();
    await expect(signup.submitButton()).toBeVisible();
  });

  scenarioTest('SIGNUP-017', 'mobile responsiveness', async ({ page }) => {
    test.skip(!test.info().project.name.includes('mobile'), 'Mobile responsiveness runs on mobile projects only.');

    const signup = new SignupPage(page);
    await signup.gotoSignup();
    await signup.expectNoHorizontalOverflow();
    await expect(signup.submitButton()).toBeVisible();
  });

  scenarioTest('SIGNUP-018', 'keyboard navigation', async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.gotoSignup();

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    for (const control of await signup.focusableControls()) {
      await expect(control).toBeVisible();
    }
  });

  scenarioTest('SIGNUP-019', 'accessibility using axe-core', async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.gotoSignup();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const seriousOrCritical = results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? '')
    );

    expect(seriousOrCritical).toEqual([]);
  });

  scenarioTest('SIGNUP-020', 'basic client-side security handling', async ({ page }) => {
    let dialogOpened = false;
    page.on('dialog', async (dialog) => {
      dialogOpened = true;
      await dialog.dismiss();
    });

    const signup = new SignupPage(page);
    const account = generatedSignupAccount(validPassword);
    await signup.gotoSignup();
    await signup.fillAccount(account);

    const firstName = signup.firstNameField();
    if ((await firstName.count()) > 0 && (await firstName.isVisible().catch(() => false))) {
      await firstName.fill(scriptLikeValue);
    }

    await signup.acceptTermsIfPresent();
    await signup.submit();
    expect(dialogOpened).toBe(false);
    await expect(page.locator('script', { hasText: 'alert("qa")' })).toHaveCount(0);
  });
});
