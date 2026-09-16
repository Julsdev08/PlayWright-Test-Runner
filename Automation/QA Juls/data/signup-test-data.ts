export const validPassword = 'QaSignup!2026';

export const invalidEmailCases = [
  { label: 'missing at sign', email: 'qa.signup.example.test' },
  { label: 'missing local part', email: '@example.test' },
  { label: 'missing domain', email: 'qa-signup@' },
  { label: 'spaces included', email: 'qa signup@example.test' },
  { label: 'double at signs', email: 'qa@@example.test' }
];

export const weakPasswordCases = [
  { label: 'too short', password: 'Qa1!' },
  { label: 'no uppercase', password: 'qasignup!2026' },
  { label: 'no lowercase', password: 'QASIGNUP!2026' },
  { label: 'no number', password: 'QaSignupOnly!' },
  { label: 'no special character', password: 'QaSignup2026' }
];

export const safeProfileData = {
  firstName: 'QA',
  lastName: 'Signup',
  phone: '5550100000'
};

export const scriptLikeValue = '<script>alert("qa")</script>';
