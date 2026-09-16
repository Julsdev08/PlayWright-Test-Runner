import 'dotenv/config';

export type TestEnvironmentName = 'local' | 'staging' | 'production';

function readEnvironmentName(): TestEnvironmentName | undefined {
  const value = process.env.TEST_ENV?.trim().toLowerCase();
  if (!value) return undefined;
  if (value === 'local' || value === 'staging' || value === 'production') return value;
  throw new Error(`Unsupported TEST_ENV "${value}". Use local, staging, or production.`);
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const url = new URL(value.trim());
  return url.toString().replace(/\/$/, '');
}

function splitNames(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

const explicitEnvironment = readEnvironmentName();
const baseURL = normalizeBaseUrl(process.env.BASE_URL ?? process.env.STAGING_BASE_URL);

export const testEnvironment = {
  name: explicitEnvironment,
  baseURL,
  accessCookieNames: splitNames(
    process.env.QA_ACCESS_COOKIE_NAMES ?? process.env.QA_COOKIE_NAMES ?? process.env.QA_ACCESS_COOKIE_NAME
  ),
  accessCredential: process.env.QA_COOKIE_VALUE ?? process.env.ACCESS_CODE,
  allowUnrecognizedStagingHost: process.env.ALLOW_UNRECOGNIZED_STAGING_HOST === 'true'
};

export function requireSafeBaseURL(): string {
  if (!testEnvironment.baseURL) {
    throw new Error(
      'No test target is configured. Set BASE_URL and TEST_ENV=local or TEST_ENV=staging. Browser tests are blocked by default.'
    );
  }

  const url = new URL(testEnvironment.baseURL);
  const host = url.hostname.toLowerCase();
  const localHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  const stagingLikeHost = ['staging', 'stage', 'qa', 'test', 'dev'].some((marker) => host.includes(marker));
  const environment = testEnvironment.name ?? (localHost ? 'local' : stagingLikeHost ? 'staging' : 'production');

  if (environment === 'production') {
    throw new Error(
      `Refusing to run automation against production-like host "${host}". Use an approved local or staging target.`
    );
  }

  if (environment === 'local' && !localHost) {
    throw new Error(`TEST_ENV=local requires localhost, 127.0.0.1, or 0.0.0.0; received "${host}".`);
  }

  if (environment === 'staging' && !stagingLikeHost && !testEnvironment.allowUnrecognizedStagingHost) {
    throw new Error(
      `Host "${host}" does not look like a non-production target. Confirm it is staging, then set ALLOW_UNRECOGNIZED_STAGING_HOST=true explicitly.`
    );
  }

  return testEnvironment.baseURL;
}
