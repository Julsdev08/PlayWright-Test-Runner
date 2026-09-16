import { requireSafeBaseURL, testEnvironment } from './env';

export type EcommerceFlowName =
  | 'signup'
  | 'login'
  | 'forgot-password'
  | 'product-listing'
  | 'product-detail'
  | 'add-to-cart'
  | 'checkout'
  | 'payment-errors'
  | 'account-dashboard'
  | 'order-history';

export type FlowRouteConfig = {
  flow: EcommerceFlowName;
  path: string;
};

const defaultRoutes: Record<EcommerceFlowName, string> = {
  signup: '/signup',
  login: '/login',
  'forgot-password': '/forgot-password',
  'product-listing': '/products',
  'product-detail': '/products/sample-product',
  'add-to-cart': '/products/sample-product',
  checkout: '/checkout',
  'payment-errors': '/checkout',
  'account-dashboard': '/account',
  'order-history': '/account/orders'
};

export const ecommerceRoutes: Record<EcommerceFlowName, FlowRouteConfig> = {
  signup: { flow: 'signup', path: process.env.SIGNUP_PATH ?? defaultRoutes.signup },
  login: { flow: 'login', path: process.env.LOGIN_PATH ?? defaultRoutes.login },
  'forgot-password': {
    flow: 'forgot-password',
    path: process.env.FORGOT_PASSWORD_PATH ?? defaultRoutes['forgot-password']
  },
  'product-listing': {
    flow: 'product-listing',
    path: process.env.PRODUCT_LISTING_PATH ?? defaultRoutes['product-listing']
  },
  'product-detail': {
    flow: 'product-detail',
    path: process.env.PRODUCT_DETAIL_PATH ?? defaultRoutes['product-detail']
  },
  'add-to-cart': { flow: 'add-to-cart', path: process.env.ADD_TO_CART_PATH ?? defaultRoutes['add-to-cart'] },
  checkout: { flow: 'checkout', path: process.env.CHECKOUT_PATH ?? defaultRoutes.checkout },
  'payment-errors': {
    flow: 'payment-errors',
    path: process.env.PAYMENT_ERRORS_PATH ?? defaultRoutes['payment-errors']
  },
  'account-dashboard': {
    flow: 'account-dashboard',
    path: process.env.ACCOUNT_DASHBOARD_PATH ?? defaultRoutes['account-dashboard']
  },
  'order-history': { flow: 'order-history', path: process.env.ORDER_HISTORY_PATH ?? defaultRoutes['order-history'] }
};

export const ecommerceConfig = {
  baseUrl: testEnvironment.baseURL ?? '',
  accessCookieNames: testEnvironment.accessCookieNames,
  accessCookieValue: testEnvironment.accessCredential,
  allowNonStagingUrl: process.env.ALLOW_NON_STAGING_ECOMMERCE_TESTS === 'true',
  allowAccountCreation: process.env.ALLOW_SIGNUP_ACCOUNT_CREATION === 'true',
  allowEmailVerificationTests: process.env.ENABLE_TEST_INBOX === 'true',
  allowBackendCleanup: process.env.ENABLE_TEST_ACCOUNT_CLEANUP === 'true',
  testEmailDomain: process.env.TEST_EMAIL_DOMAIN ?? 'example.test',
  existingAccountEmail: process.env.EXISTING_TEST_ACCOUNT_EMAIL,
  api: {
    signupUrlPattern: process.env.SIGNUP_API_PATTERN ?? '**/*signup*',
    loginUrlPattern: process.env.LOGIN_API_PATTERN ?? '**/*login*',
    forgotPasswordUrlPattern: process.env.FORGOT_PASSWORD_API_PATTERN ?? '**/*forgot*',
    checkoutUrlPattern: process.env.CHECKOUT_API_PATTERN ?? '**/*checkout*'
  }
};

export function assertStagingOnly(): void {
  const baseUrl = requireSafeBaseURL();
  const url = new URL(baseUrl);
  const host = url.hostname.toLowerCase();
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  const looksStaging =
    host.includes('staging') ||
    host.includes('stage') ||
    host.includes('dev') ||
    host.includes('qa') ||
    host.includes('test');

  if (!isLocal && !looksStaging) {
    throw new Error(
      `Ecommerce automation is staging-only. Refusing to run against "${baseUrl}". Set STAGING_BASE_URL to a staging, QA, dev, test, or local URL.`
    );
  }
}
