import { EcommerceFlowName } from '../config/ecommerce.config';

export type ScenarioPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type AutomationFeasibility = 'Automated' | 'Automated with backend support' | 'Needs manual verification';

export type EcommerceScenario = {
  id: string;
  flow: EcommerceFlowName;
  title: string;
  preconditions: string[];
  testData: string;
  steps: string[];
  expectedResult: string;
  priority: ScenarioPriority;
  automationFeasibility: AutomationFeasibility;
};

export const signupScenarios: EcommerceScenario[] = [
  {
    id: 'SIGNUP-001',
    flow: 'signup',
    title: 'Successful registration',
    preconditions: ['Staging URL is configured', 'Account creation is explicitly enabled for QA data'],
    testData: 'Unique generated email, compliant password, accepted terms',
    steps: ['Open sign-up page', 'Fill all required fields', 'Accept terms/privacy', 'Submit form'],
    expectedResult: 'Account is created once and user sees the expected success or verification state.',
    priority: 'P0',
    automationFeasibility: 'Automated with backend support'
  },
  {
    id: 'SIGNUP-002',
    flow: 'signup',
    title: 'Required-field validation',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Empty required fields',
    steps: ['Open sign-up page', 'Submit the empty form'],
    expectedResult: 'Required fields show accessible validation messages and submission is not accepted.',
    priority: 'P0',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-003',
    flow: 'signup',
    title: 'Email format edge cases',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Malformed email addresses',
    steps: ['Open sign-up page', 'Enter each invalid email', 'Complete other fields with valid values', 'Submit form'],
    expectedResult: 'Invalid email values are rejected with a clear validation message.',
    priority: 'P0',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-004',
    flow: 'signup',
    title: 'Password policy edge cases',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Weak passwords that violate common policy rules',
    steps: ['Open sign-up page', 'Enter a weak password', 'Confirm the same weak password', 'Submit form'],
    expectedResult: 'Weak passwords are rejected and the user receives password-policy guidance.',
    priority: 'P0',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-005',
    flow: 'signup',
    title: 'Password confirmation mismatch',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Different password and confirmation values',
    steps: ['Open sign-up page', 'Enter valid account details', 'Enter mismatched confirmation', 'Submit form'],
    expectedResult: 'The mismatch is rejected and no account is created.',
    priority: 'P0',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-006',
    flow: 'signup',
    title: 'Existing email registration',
    preconditions: ['A known QA account already exists in staging'],
    testData: 'EXISTING_TEST_ACCOUNT_EMAIL',
    steps: ['Open sign-up page', 'Register using the existing email'],
    expectedResult: 'The duplicate email is rejected without exposing sensitive account details.',
    priority: 'P1',
    automationFeasibility: 'Automated with backend support'
  },
  {
    id: 'SIGNUP-007',
    flow: 'signup',
    title: 'Terms and privacy consent',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Valid account data with unchecked consent',
    steps: ['Open sign-up page', 'Fill required fields', 'Leave terms/privacy unchecked', 'Submit form'],
    expectedResult: 'Submission is blocked until required consent is provided.',
    priority: 'P0',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-008',
    flow: 'signup',
    title: 'Email verification',
    preconditions: ['Test inbox or backend email lookup is configured'],
    testData: 'New QA account and verification email',
    steps: ['Create account', 'Read verification link from test inbox', 'Open verification link'],
    expectedResult: 'The account is verified and the user sees the expected verified state.',
    priority: 'P1',
    automationFeasibility: 'Automated with backend support'
  },
  {
    id: 'SIGNUP-009',
    flow: 'signup',
    title: 'Resend verification',
    preconditions: ['Test inbox or backend email lookup is configured'],
    testData: 'Unverified QA account',
    steps: ['Create or use unverified account', 'Click resend verification', 'Inspect newest email'],
    expectedResult: 'A new verification email is sent and the UI confirms resend success.',
    priority: 'P1',
    automationFeasibility: 'Automated with backend support'
  },
  {
    id: 'SIGNUP-010',
    flow: 'signup',
    title: 'Expired and invalid verification links',
    preconditions: ['Expired and invalid verification URLs are available from backend/test data'],
    testData: 'Expired link and invalid token link',
    steps: ['Open each verification link'],
    expectedResult: 'Invalid links are rejected with a safe recovery option.',
    priority: 'P2',
    automationFeasibility: 'Automated with backend support'
  },
  {
    id: 'SIGNUP-011',
    flow: 'signup',
    title: 'Double-click and duplicate submission prevention',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Valid generated account details',
    steps: ['Fill form', 'Trigger submit twice quickly'],
    expectedResult: 'Only one submission is sent, and the submit control is disabled or guarded while loading.',
    priority: 'P0',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-012',
    flow: 'signup',
    title: 'Loading and disabled-button states',
    preconditions: ['Sign-up API can be delayed by route mocking'],
    testData: 'Valid generated account details',
    steps: ['Delay sign-up response', 'Submit form', 'Inspect submit button while request is pending'],
    expectedResult: 'Submit control shows loading/disabled state and prevents duplicate actions.',
    priority: 'P1',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-013',
    flow: 'signup',
    title: 'API validation errors',
    preconditions: ['Sign-up API can be mocked'],
    testData: 'Mocked 422 response',
    steps: ['Mock validation response', 'Submit valid-looking form'],
    expectedResult: 'Server validation errors are rendered clearly without losing the form context.',
    priority: 'P1',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-014',
    flow: 'signup',
    title: 'Server errors',
    preconditions: ['Sign-up API can be mocked'],
    testData: 'Mocked 500 response',
    steps: ['Mock server error response', 'Submit valid-looking form'],
    expectedResult: 'A safe, helpful error message is shown and sensitive details are not exposed.',
    priority: 'P1',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-015',
    flow: 'signup',
    title: 'Network timeout and retry behavior',
    preconditions: ['Sign-up API can be aborted or delayed by route mocking'],
    testData: 'Timed-out sign-up request',
    steps: ['Simulate network timeout', 'Submit form'],
    expectedResult: 'The user gets a recoverable error state and can retry without duplicate account creation.',
    priority: 'P2',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-016',
    flow: 'signup',
    title: 'Desktop responsiveness',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Desktop viewport',
    steps: ['Open sign-up page on desktop', 'Inspect layout and horizontal overflow'],
    expectedResult: 'Fields, labels, errors, and actions fit without overlap or unintended overflow.',
    priority: 'P1',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-017',
    flow: 'signup',
    title: 'Mobile responsiveness',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Mobile viewport',
    steps: ['Open sign-up page on mobile', 'Inspect layout and horizontal overflow'],
    expectedResult: 'Form remains usable on mobile with no clipped fields or hidden primary action.',
    priority: 'P1',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-018',
    flow: 'signup',
    title: 'Keyboard navigation',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Keyboard-only navigation',
    steps: ['Tab through form controls', 'Fill fields by keyboard', 'Submit by keyboard'],
    expectedResult: 'Focus order is logical and visible, and all required actions are keyboard accessible.',
    priority: 'P1',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-019',
    flow: 'signup',
    title: 'Accessibility using axe-core',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Axe WCAG scan',
    steps: ['Open sign-up page', 'Run axe accessibility scan'],
    expectedResult: 'No serious or critical automated accessibility violations are detected.',
    priority: 'P1',
    automationFeasibility: 'Automated'
  },
  {
    id: 'SIGNUP-020',
    flow: 'signup',
    title: 'Basic client-side security handling',
    preconditions: ['Sign-up page is reachable'],
    testData: 'Script-like input in non-email text fields',
    steps: ['Enter script-like values where text inputs allow them', 'Submit or trigger validation'],
    expectedResult: 'Input is not executed or reflected as unsafe HTML, and logs do not expose secrets.',
    priority: 'P1',
    automationFeasibility: 'Automated'
  }
];

const flowTitles: Record<EcommerceFlowName, string[]> = {
  signup: signupScenarios.map((scenario) => scenario.title),
  login: ['Successful login', 'Required validation', 'Invalid credentials', 'Lockout/rate-limit behavior'],
  'forgot-password': ['Request reset link', 'Required validation', 'Unknown email handling', 'Expired reset link'],
  'product-listing': ['Product grid loads', 'Filter and sort behavior', 'Pagination/load more', 'Empty results state'],
  'product-detail': ['Product content accuracy', 'Variant selection', 'Image gallery behavior', 'Quantity selector'],
  'add-to-cart': ['Add single item', 'Add variant item', 'Mini-cart/cart count update', 'Duplicate click prevention'],
  checkout: ['Guest checkout', 'Address validation', 'Shipping method selection', 'Order review'],
  'payment-errors': ['Declined card', 'Gateway timeout', '3DS/cancelled challenge handling', 'Retry after failure'],
  'account-dashboard': ['Dashboard requires auth', 'Profile details render', 'Editable account data validation'],
  'order-history': ['Order list loads', 'Order detail opens', 'Empty order state', 'Auth protection']
};

export const ecommerceScenarioBacklog: EcommerceScenario[] = Object.entries(flowTitles).flatMap(([flow, titles]) =>
  titles.map((title, index) => ({
    id: `${flow.toUpperCase().replace(/-/g, '_')}-${String(index + 1).padStart(3, '0')}`,
    flow: flow as EcommerceFlowName,
    title,
    preconditions: ['Staging URL is configured', `${flow} route is configured`],
    testData: 'Flow-specific QA data to be configured before execution',
    steps: ['Open configured route', 'Exercise the primary user behavior', 'Validate UI and related network response'],
    expectedResult: 'The flow behaves correctly, safely, and consistently across desktop and mobile.',
    priority: index === 0 ? 'P0' : 'P1',
    automationFeasibility: 'Automated'
  }))
);
