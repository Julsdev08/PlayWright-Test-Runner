import { expect, test } from '../../fixtures/qa-test';
import { testEnvironment } from '../../config/env';

test('SIGNUP-REP-003 duplicate registration submission is prevented @critical @regression @desktop', async ({
  page,
  signupPage,
  signupAccount
}) => {
  let requestCount = 0;
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });

  await page.route(testEnvironment.signupApiPattern, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }

    requestCount += 1;
    await responseGate;
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Controlled QA validation response' })
    });
  });

  await signupPage.gotoSignup();
  await signupPage.fillAccount(signupAccount);
  await signupPage.acceptTermsIfPresent();
  const submit = signupPage.submitButton();

  try {
    await Promise.allSettled([submit.click(), submit.click()]);
    await expect.poll(() => requestCount, { message: 'Exactly one signup request should be sent.' }).toBe(1);
    await expect(submit).toBeDisabled();
  } finally {
    releaseResponse();
    await page.unroute(testEnvironment.signupApiPattern);
  }
});

