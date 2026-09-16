import fs from 'fs';
import path from 'path';
import { resolveProjectDirectory } from './project-config.loader';
import { WebsiteProjectConfig, WebsiteType } from './project-config.types';

export type OnboardingOptions = {
  root?: string;
  projectSlug: string;
  projectName: string;
  websiteType: WebsiteType;
};

export function createProjectScaffold(options: OnboardingOptions): string {
  const root = options.root ?? process.cwd();
  const projectDirectory = resolveProjectDirectory(options.projectSlug, root);
  const configPath = path.join(projectDirectory, 'project.config.json');
  if (fs.existsSync(configPath)) throw new Error(`Project already exists: ${projectDirectory}`);

  const directories = [
    'config',
    'pages',
    'components',
    'test-data',
    'tests/smoke',
    'tests/functional',
    'tests/regression',
    'tests/responsive',
    'tests/accessibility',
    'artifacts/discovery',
    'artifacts/plans',
    'artifacts/approvals',
    'artifacts/summaries'
  ];
  for (const directory of directories) fs.mkdirSync(path.join(projectDirectory, directory), { recursive: true });

  const config: WebsiteProjectConfig = {
    schemaVersion: 1,
    projectName: options.projectName,
    projectSlug: options.projectSlug,
    baseUrlEnv: 'BASE_URL',
    testEnvironment: 'staging',
    websiteType: options.websiteType,
    testingScope: ['read-only discovery'],
    includedPages: ['/'],
    excludedPages: [],
    allowedDomains: ['replace-with-approved-host.example'],
    browserProjects: [
      { name: 'desktop-chromium', device: 'desktop', enabled: true },
      { name: 'mobile-chromium', device: 'mobile', enabled: true }
    ],
    authentication: {
      required: false,
      strategy: 'none',
      credentialEnvVars: [],
      approvedTestAccounts: []
    },
    formsAllowedForSubmission: [],
    actions: {
      allowed: ['read-only'],
      prohibited: ['data-creating', 'notification-triggering', 'destructive', 'transaction-related', 'file-upload']
    },
    productionSafety: {
      allowReadOnly: true,
      allowWriteActions: false,
      requireExplicitApprovalForWrites: true
    },
    testData: { format: 'generated', notes: 'Define the approved format before tests create or submit data.' },
    requiredTags: ['@smoke', '@regression', '@desktop', '@mobile', '@accessibility'],
    reporting: {
      outputDir: 'artifacts/summaries',
      formats: ['html', 'json', 'markdown']
    }
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { flag: 'wx' });
  fs.writeFileSync(path.join(projectDirectory, '.env.example'), 'BASE_URL=\n', { flag: 'wx' });
  fs.writeFileSync(
    path.join(projectDirectory, 'README.md'),
    `# ${options.projectName}\n\nReview project.config.json, copy .env.example to an ignored .env file, and validate before discovery.\n`,
    { flag: 'wx' }
  );
  return projectDirectory;
}
