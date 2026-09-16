import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(pathname: string): Promise<void> {
    await this.page.goto(pathname, { waitUntil: 'domcontentloaded' });
  }

  currentUrl(): string {
    return this.page.url();
  }
}
