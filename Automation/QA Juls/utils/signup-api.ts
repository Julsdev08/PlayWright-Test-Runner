import { Page, Response } from '@playwright/test';
import { ecommerceConfig } from '../config/ecommerce.config';

export function waitForSignupResponse(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().toLowerCase().includes(ecommerceConfig.api.signupUrlPattern.replace(/\*/g, '').toLowerCase()) &&
      response.request().method() !== 'GET',
    { timeout: 15_000 }
  );
}

export async function mockSignupApi(page: Page, status: number, body: unknown): Promise<void> {
  await page.route(ecommerceConfig.api.signupUrlPattern, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body)
    });
  });
}

export async function abortSignupApi(page: Page): Promise<void> {
  await page.route(ecommerceConfig.api.signupUrlPattern, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }

    await route.abort('timedout');
  });
}
