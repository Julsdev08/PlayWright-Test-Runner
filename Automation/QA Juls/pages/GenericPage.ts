import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class GenericPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  async visibleCount(selector: string): Promise<number> {
    return this.page.locator(selector).filter({ hasNotText: /^\s*$/ }).count();
  }
}
