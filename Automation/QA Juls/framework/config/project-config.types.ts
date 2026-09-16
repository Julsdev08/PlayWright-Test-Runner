export const websiteTypes = ['marketing', 'e-commerce', 'web-application', 'dashboard', 'custom'] as const;
export type WebsiteType = (typeof websiteTypes)[number];

export const environmentNames = ['local', 'staging', 'production'] as const;
export type EnvironmentName = (typeof environmentNames)[number];

export const actionCategories = [
  'read-only',
  'data-creating',
  'notification-triggering',
  'destructive',
  'transaction-related',
  'file-upload'
] as const;
export type ActionCategory = (typeof actionCategories)[number];

export type DeviceKind = 'desktop' | 'mobile';

export type BrowserProjectConfig = {
  name: string;
  device: DeviceKind;
  enabled: boolean;
};

export type ApprovedTestAccount = {
  name: string;
  role?: string;
  usernameEnvVar: string;
  passwordEnvVar?: string;
  storageStatePath?: string;
};

export type AuthenticationConfig = {
  required: boolean;
  strategy: 'none' | 'credentials' | 'storage-state' | 'access-gate' | 'custom';
  credentialEnvVars: string[];
  approvedTestAccounts: ApprovedTestAccount[];
  notes?: string;
};

export type ProductionSafetyConfig = {
  allowReadOnly: boolean;
  allowWriteActions: boolean;
  requireExplicitApprovalForWrites: boolean;
};

export type TestDataConfig = {
  format: 'json' | 'csv' | 'generated' | 'custom';
  path?: string;
  notes?: string;
};

export type ReportingConfig = {
  outputDir: string;
  formats: Array<'html' | 'json' | 'markdown' | 'xlsx'>;
  excel?: {
    templatePath: string;
    outputFile: string;
    sheetName?: string;
    owner?: string;
  };
};

export type WebsiteProjectConfig = {
  schemaVersion: 1;
  projectName: string;
  projectSlug: string;
  baseURL?: string;
  baseUrlEnv?: string;
  testEnvironment: EnvironmentName;
  websiteType: WebsiteType;
  testingScope: string[];
  includedPages: string[];
  excludedPages: string[];
  allowedDomains: string[];
  browserProjects: BrowserProjectConfig[];
  authentication: AuthenticationConfig;
  formsAllowedForSubmission: string[];
  actions: {
    allowed: ActionCategory[];
    prohibited: ActionCategory[];
  };
  productionSafety: ProductionSafetyConfig;
  testData: TestDataConfig;
  requiredTags: string[];
  reporting: ReportingConfig;
};
