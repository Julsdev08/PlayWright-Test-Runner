import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ecommerceRoutes } from '../config/ecommerce.config';
import { GeneratedSignupAccount } from '../utils/test-data';
import { AccessGate } from '../components/AccessGate';

export class SignupPage extends BasePage {
  constructor(page: Page, private readonly accessGate?: AccessGate) {
    super(page);
  }

  async gotoSignup(): Promise<void> {
    await this.goto(ecommerceRoutes.signup.path);
    await this.accessGate?.unlockIfPresent();
    await expect(this.form()).toBeVisible();
  }

  form(): Locator {
    return this.page.locator('form').first();
  }

  emailField(): Locator {
    return this.page.getByRole('textbox', { name: /^email(?: address)?$/i }).or(this.page.getByLabel(/^email(?: address)?$/i)).first();
  }

  passwordField(): Locator {
    return this.page
      .getByLabel(/^password$|password/i)
      .or(this.page.getByPlaceholder(/password/i))
      .first();
  }

  confirmPasswordField(): Locator {
    return this.page
      .getByLabel(/confirm password|password confirmation|re-enter password|repeat password/i)
      .or(this.page.getByPlaceholder(/confirm password|password confirmation|re-enter password|repeat password/i))
      .first();
  }

  firstNameField(): Locator {
    return this.page.getByLabel(/first name|given name/i).or(this.page.getByPlaceholder(/first name|given name/i)).first();
  }

  lastNameField(): Locator {
    return this.page.getByLabel(/last name|surname|family name/i).or(this.page.getByPlaceholder(/last name|surname|family name/i)).first();
  }

  phoneField(): Locator {
    return this.page.getByLabel(/phone|mobile/i).or(this.page.getByPlaceholder(/phone|mobile/i)).first();
  }

  cityField(): Locator {
    return this.page.getByLabel(/city/i).or(this.page.getByPlaceholder(/city/i)).first();
  }

  stateField(): Locator {
    return this.page.getByLabel(/state/i).or(this.page.locator('select[name*="state" i], select[id*="state" i]')).first();
  }

  voucherRadio(): Locator {
    return this.page.getByRole('radio').first();
  }

  termsCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /terms|privacy|agree|consent/i }).first();
  }

  submitButton(): Locator {
    return this.page
      .getByRole('button', { name: /sign up|signup|create account|register|continue|submit|join|waitlist|get notified/i })
      .or(this.page.getByRole('button', { name: /early access/i }))
      .or(this.page.locator('input[type="submit"]'))
      .or(this.page.locator('button[type="submit"]'))
      .first();
  }

  statusMessage(): Locator {
    return this.page
      .getByRole('alert')
      .or(this.page.getByText(/required|invalid|already|exists|check your email|verification|success|created|error|try again/i))
      .first();
  }

  resendVerificationButton(): Locator {
    return this.page.getByRole('button', { name: /resend|send again/i }).first();
  }

  async fillAccount(account: GeneratedSignupAccount): Promise<void> {
    await this.fillIfVisible(this.firstNameField(), account.firstName);
    await this.fillIfVisible(this.lastNameField(), account.lastName);
    await this.fillIfVisible(this.phoneField(), account.phone);
    await this.fillIfVisible(this.cityField(), account.city);
    await this.selectIfVisible(this.stateField(), account.state);
    await this.checkIfVisible(this.voucherRadio());
    await this.emailField().fill(account.email);
    await this.fillIfVisible(this.passwordField(), account.password);
    await this.fillIfVisible(this.confirmPasswordField(), account.password);
  }

  async acceptTermsIfPresent(): Promise<void> {
    const checkbox = this.termsCheckbox();
    if ((await checkbox.count()) > 0 && (await checkbox.isVisible().catch(() => false))) {
      await checkbox.check();
    }
  }

  async submit(): Promise<void> {
    await this.submitButton().click();
  }

  async expectValidationFeedback(pattern = /required|invalid|must|already|exists|agree|terms|privacy|error|try again/i): Promise<void> {
    const visibleMessage = this.page.getByText(pattern).or(this.page.getByRole('alert')).first();
    if ((await visibleMessage.count()) > 0 && (await visibleMessage.isVisible().catch(() => false))) {
      return;
    }

    const invalidControlCount = await this.page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll('input, select, textarea')) as HTMLInputElement[];
      return controls.filter((control) => !control.checkValidity()).length;
    });
    expect(invalidControlCount).toBeGreaterThan(0);
  }

  async expectNoHorizontalOverflow(): Promise<void> {
    const hasOverflow = await this.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasOverflow).toBe(false);
  }

  async focusableControls(): Promise<Locator[]> {
    const controls = [this.firstNameField(), this.lastNameField(), this.emailField(), this.submitButton()];
    const visibleControls: Locator[] = [];

    for (const control of controls) {
      if ((await control.count()) > 0 && (await control.isVisible().catch(() => false))) {
        visibleControls.push(control);
      }
    }

    return visibleControls;
  }

  private async fillIfVisible(locator: Locator, value: string): Promise<void> {
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
      await locator.fill(value);
    }
  }

  private async selectIfVisible(locator: Locator, value: string): Promise<void> {
    if ((await locator.count()) === 0 || !(await locator.isVisible().catch(() => false))) {
      return;
    }

    await locator.selectOption(value, { timeout: 2_000 }).catch(async () => {
      await locator.selectOption({ index: 1 }, { timeout: 2_000 }).catch(() => undefined);
    });
  }

  private async checkIfVisible(locator: Locator): Promise<void> {
    if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
      await locator.check();
    }
  }
}
