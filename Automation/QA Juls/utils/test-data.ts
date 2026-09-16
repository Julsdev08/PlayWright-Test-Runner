import crypto from 'crypto';
import { ecommerceConfig } from '../config/ecommerce.config';

export type GeneratedSignupAccount = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  state: string;
};

export function uniqueEmail(prefix = 'qa-signup'): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${timestamp}-${suffix}@${ecommerceConfig.testEmailDomain}`;
}

export function generatedSignupAccount(password: string): GeneratedSignupAccount {
  return {
    email: uniqueEmail(),
    password,
    firstName: 'QA',
    lastName: 'Automation',
    phone: '5550100000',
    city: 'New York',
    state: 'NY'
  };
}

export function redactSecrets(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/password["']?\s*[:=]\s*["'][^"']+["']/gi, 'password="[redacted]"')
    .replace(/token["']?\s*[:=]\s*["'][^"']+["']/gi, 'token="[redacted]"');
}
