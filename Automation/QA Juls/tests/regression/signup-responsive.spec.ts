import { expect, test } from '../../fixtures/qa-test';

test('SIGNUP-REP-004 registration form fits the mobile viewport @regression @mobile', async ({ page, signupPage }) => {
  await signupPage.gotoSignup();

  await expect(signupPage.form()).toBeVisible();
  await signupPage.submitButton().scrollIntoViewIfNeeded();
  await expect(signupPage.submitButton()).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth
  }));
  expect(layout.documentWidth, 'The signup page should not overflow horizontally.').toBeLessThanOrEqual(
    layout.viewportWidth + 1
  );
});

