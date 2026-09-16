import { APIRequestContext } from '@playwright/test';
import { ecommerceConfig } from '../config/ecommerce.config';

const createdEmails = new Set<string>();

export function trackCreatedSignupEmail(email: string): void {
  createdEmails.add(email);
}

export async function cleanupCreatedSignupAccounts(request: APIRequestContext): Promise<void> {
  if (!ecommerceConfig.allowBackendCleanup || createdEmails.size === 0) {
    return;
  }

  const cleanupEndpoint = process.env.TEST_ACCOUNT_CLEANUP_ENDPOINT;
  if (!cleanupEndpoint) {
    return;
  }

  for (const email of createdEmails) {
    await request
      .delete(cleanupEndpoint, {
        data: { email },
        failOnStatusCode: false
      })
      .catch(() => undefined);
  }
}
