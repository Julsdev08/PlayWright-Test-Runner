import { expect, test } from '../../fixtures/qa-test';

test('SIGNUP-REP-001 registration form is accessible @smoke @desktop @accessibility', async ({ signupPage }) => {
  await signupPage.gotoSignup();

  await expect(signupPage.form()).toBeVisible();
  await expect(signupPage.emailField()).toBeVisible();
  await expect(signupPage.emailField()).toHaveAttribute('type', 'email');
  await expect(signupPage.submitButton()).toBeVisible();
});

