import { Page } from '@playwright/test';
import { testEnvironment } from '../config/env';

export class AccessGate {
  constructor(
    private readonly page: Page,
    private readonly baseURL: string
  ) {}

  async applyAccessCookies(): Promise<void> {
    const { accessCookieNames, accessCredential } = testEnvironment;
    if (!accessCredential || accessCookieNames.length === 0) return;

    const url = new URL(this.baseURL);
    await this.page.context().addCookies(
      accessCookieNames.map((name) => ({
        name,
        value: accessCredential,
        domain: url.hostname,
        path: '/',
        httpOnly: false,
        secure: url.protocol === 'https:',
        sameSite: 'Lax' as const
      }))
    );
  }

  async unlockIfPresent(): Promise<void> {
    const gateInput = this.page.getByLabel(/access code|site password|preview password/i);
    if ((await gateInput.count()) === 0 || !(await gateInput.isVisible())) return;

    if (!testEnvironment.accessCredential) {
      throw new Error('An access gate is visible, but QA_COOKIE_VALUE or ACCESS_CODE is not configured.');
    }

    await gateInput.fill(testEnvironment.accessCredential);
    const unlockButton = this.page.getByRole('button', { name: /enter|unlock|continue|submit|view site/i });
    await unlockButton.click();
    await gateInput.waitFor({ state: 'hidden' });
  }
}

