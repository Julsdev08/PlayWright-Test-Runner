import { BrowserContext } from '@playwright/test';
import { ecommerceConfig } from '../config/ecommerce.config';

export async function applyAccessCookies(context: BrowserContext): Promise<void> {
  if (!ecommerceConfig.accessCookieValue || ecommerceConfig.accessCookieNames.length === 0) {
    return;
  }

  const url = new URL(ecommerceConfig.baseUrl);
  await context.addCookies(
    ecommerceConfig.accessCookieNames.map((name) => ({
      name,
      value: ecommerceConfig.accessCookieValue!,
      domain: url.hostname,
      path: '/',
      httpOnly: false,
      secure: url.protocol === 'https:',
      sameSite: 'Lax' as const
    }))
  );
}
