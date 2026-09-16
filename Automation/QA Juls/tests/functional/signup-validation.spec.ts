import { expect, test } from '../../fixtures/qa-test';

test('SIGNUP-REP-002 empty registration is rejected @regression @desktop', async ({ page, signupPage }) => {
  await signupPage.gotoSignup();
  const initialUrl = page.url();
  const email = signupPage.emailField();
  const submit = signupPage.submitButton();

  if (await submit.isEnabled()) {
    await submit.click();
  }

  await expect(page).toHaveURL(initialUrl);
  const exposesInvalidState = await email.evaluate(
    (element: HTMLInputElement) => !element.checkValidity() || element.getAttribute('aria-invalid') === 'true'
  );
  expect(
    exposesInvalidState,
    'The required email field should expose native or ARIA invalid state after empty submission.'
  ).toBe(true);
});

