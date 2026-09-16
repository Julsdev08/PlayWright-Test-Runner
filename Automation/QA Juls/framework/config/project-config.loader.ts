import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  actionCategories,
  environmentNames,
  WebsiteProjectConfig,
  websiteTypes
} from './project-config.types';

export class ProjectConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid project configuration:\n- ${problems.join('\n- ')}`);
  }
}

export function resolveProjectDirectory(project: string, root = process.cwd()): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project)) {
    throw new ProjectConfigError(['Project slug must contain lowercase letters, numbers, and single hyphens only.']);
  }

  const projectsRoot = path.resolve(root, 'projects');
  const projectDirectory = path.resolve(projectsRoot, project);
  if (!projectDirectory.startsWith(`${projectsRoot}${path.sep}`)) {
    throw new ProjectConfigError(['Project path escapes the projects directory.']);
  }
  return projectDirectory;
}

export function loadProjectConfig(project: string, root = process.cwd()): WebsiteProjectConfig {
  const projectDirectory = resolveProjectDirectory(project, root);
  const environmentPath = path.join(projectDirectory, '.env');
  if (fs.existsSync(environmentPath)) dotenv.config({ path: environmentPath, override: false, quiet: true });

  const configPath = path.join(projectDirectory, 'project.config.json');
  if (!fs.existsSync(configPath)) {
    throw new ProjectConfigError([`Configuration not found: ${configPath}`]);
  }

  let input: unknown;
  try {
    input = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    throw new ProjectConfigError([`Could not parse ${configPath}: ${String(error)}`]);
  }
  return validateProjectConfig(input);
}

export function resolveConfiguredBaseURL(config: WebsiteProjectConfig): string | undefined {
  return config.baseURL ?? (config.baseUrlEnv ? process.env[config.baseUrlEnv] : undefined);
}

export function validateProjectConfig(input: unknown): WebsiteProjectConfig {
  const problems: string[] = [];
  if (!isRecord(input)) throw new ProjectConfigError(['Configuration root must be a JSON object.']);

  requireEqual(input.schemaVersion, 1, 'schemaVersion must be 1.', problems);
  requireString(input.projectName, 'projectName', problems);
  requireString(input.projectSlug, 'projectSlug', problems);
  if (typeof input.projectSlug === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.projectSlug)) {
    problems.push('projectSlug must use lowercase kebab-case.');
  }

  if (!input.baseURL && !input.baseUrlEnv) problems.push('Either baseURL or baseUrlEnv is required.');
  if (input.baseURL !== undefined) {
    requireString(input.baseURL, 'baseURL', problems);
    try {
      new URL(String(input.baseURL));
    } catch {
      problems.push('baseURL must be an absolute URL.');
    }
  }
  if (input.baseUrlEnv !== undefined && !/^[A-Z][A-Z0-9_]*$/.test(String(input.baseUrlEnv))) {
    problems.push('baseUrlEnv must be an uppercase environment-variable name.');
  }

  requireEnum(input.testEnvironment, environmentNames, 'testEnvironment', problems);
  requireEnum(input.websiteType, websiteTypes, 'websiteType', problems);
  requireStringArray(input.testingScope, 'testingScope', problems);
  requirePathArray(input.includedPages, 'includedPages', problems);
  requirePathArray(input.excludedPages, 'excludedPages', problems);
  requireStringArray(input.allowedDomains, 'allowedDomains', problems, true);
  requireStringArray(input.formsAllowedForSubmission, 'formsAllowedForSubmission', problems);
  requireStringArray(input.requiredTags, 'requiredTags', problems);
  if (Array.isArray(input.requiredTags) && input.requiredTags.some((tag) => typeof tag === 'string' && !tag.startsWith('@'))) {
    problems.push('Every requiredTags entry must start with @.');
  }

  validateBrowserProjects(input.browserProjects, problems);
  validateAuthentication(input.authentication, problems);
  validateActions(input.actions, problems);
  validateProductionSafety(input.productionSafety, problems);
  validateTestData(input.testData, problems);
  validateReporting(input.reporting, problems);

  if (problems.length > 0) throw new ProjectConfigError(problems);
  return input as WebsiteProjectConfig;
}

function validateBrowserProjects(value: unknown, problems: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    problems.push('browserProjects must contain at least one project.');
    return;
  }
  const names = new Set<string>();
  let enabled = 0;
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      problems.push(`browserProjects[${index}] must be an object.`);
      continue;
    }
    requireString(item.name, `browserProjects[${index}].name`, problems);
    requireEnum(item.device, ['desktop', 'mobile'] as const, `browserProjects[${index}].device`, problems);
    if (typeof item.enabled !== 'boolean') problems.push(`browserProjects[${index}].enabled must be boolean.`);
    if (item.enabled === true) enabled += 1;
    if (typeof item.name === 'string') {
      if (names.has(item.name)) problems.push(`Duplicate browser project name: ${item.name}.`);
      names.add(item.name);
    }
  }
  if (enabled === 0) problems.push('At least one browser project must be enabled.');
}

function validateAuthentication(value: unknown, problems: string[]): void {
  if (!isRecord(value)) {
    problems.push('authentication must be an object.');
    return;
  }
  if (typeof value.required !== 'boolean') problems.push('authentication.required must be boolean.');
  requireEnum(
    value.strategy,
    ['none', 'credentials', 'storage-state', 'access-gate', 'custom'] as const,
    'authentication.strategy',
    problems
  );
  requireStringArray(value.credentialEnvVars, 'authentication.credentialEnvVars', problems);
  if (!Array.isArray(value.approvedTestAccounts)) problems.push('authentication.approvedTestAccounts must be an array.');
}

function validateActions(value: unknown, problems: string[]): void {
  if (!isRecord(value)) {
    problems.push('actions must be an object.');
    return;
  }
  requireEnumArray(value.allowed, actionCategories, 'actions.allowed', problems);
  requireEnumArray(value.prohibited, actionCategories, 'actions.prohibited', problems);
  if (Array.isArray(value.allowed) && Array.isArray(value.prohibited)) {
    const overlap = value.allowed.filter((item) => value.prohibited.includes(item));
    if (overlap.length > 0) problems.push(`Actions cannot be both allowed and prohibited: ${overlap.join(', ')}.`);
  }
}

function validateProductionSafety(value: unknown, problems: string[]): void {
  if (!isRecord(value)) {
    problems.push('productionSafety must be an object.');
    return;
  }
  for (const field of ['allowReadOnly', 'allowWriteActions', 'requireExplicitApprovalForWrites']) {
    if (typeof value[field] !== 'boolean') problems.push(`productionSafety.${field} must be boolean.`);
  }
}

function validateTestData(value: unknown, problems: string[]): void {
  if (!isRecord(value)) {
    problems.push('testData must be an object.');
    return;
  }
  requireEnum(value.format, ['json', 'csv', 'generated', 'custom'] as const, 'testData.format', problems);
  if (value.path !== undefined && (typeof value.path !== 'string' || path.isAbsolute(value.path) || value.path.includes('..'))) {
    problems.push('testData.path must be a project-relative path without .. segments.');
  }
}

function validateReporting(value: unknown, problems: string[]): void {
  if (!isRecord(value)) {
    problems.push('reporting must be an object.');
    return;
  }
  requireString(value.outputDir, 'reporting.outputDir', problems);
  if (typeof value.outputDir === 'string' && (path.isAbsolute(value.outputDir) || value.outputDir.includes('..'))) {
    problems.push('reporting.outputDir must be a project-relative path without .. segments.');
  }
  requireEnumArray(value.formats, ['html', 'json', 'markdown', 'xlsx'] as const, 'reporting.formats', problems);
  if (Array.isArray(value.formats) && value.formats.includes('xlsx')) {
    if (!isRecord(value.excel)) {
      problems.push('reporting.excel is required when xlsx reporting is enabled.');
    } else {
      requireSafeRelativePath(value.excel.templatePath, 'reporting.excel.templatePath', problems);
      requireSafeRelativePath(value.excel.outputFile, 'reporting.excel.outputFile', problems);
      if (value.excel.sheetName !== undefined) requireString(value.excel.sheetName, 'reporting.excel.sheetName', problems);
      if (value.excel.owner !== undefined) requireString(value.excel.owner, 'reporting.excel.owner', problems);
    }
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string, problems: string[]): void {
  if (typeof value !== 'string' || value.trim() === '') problems.push(`${field} must be a non-empty string.`);
}

function requireStringArray(value: unknown, field: string, problems: string[], nonEmpty = false): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    problems.push(`${field} must be an array of non-empty strings.`);
  } else if (nonEmpty && value.length === 0) {
    problems.push(`${field} must not be empty.`);
  }
}

function requirePathArray(value: unknown, field: string, problems: string[]): void {
  requireStringArray(value, field, problems);
  if (Array.isArray(value) && value.some((item) => typeof item === 'string' && !item.startsWith('/'))) {
    problems.push(`${field} entries must start with /.`);
  }
}

function requireEnum<T extends readonly string[]>(value: unknown, allowed: T, field: string, problems: string[]): void {
  if (typeof value !== 'string' || !allowed.includes(value)) problems.push(`${field} must be one of: ${allowed.join(', ')}.`);
}

function requireEnumArray<T extends readonly string[]>(value: unknown, allowed: T, field: string, problems: string[]): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !allowed.includes(item))) {
    problems.push(`${field} must contain only: ${allowed.join(', ')}.`);
  }
}

function requireEqual(value: unknown, expected: unknown, message: string, problems: string[]): void {
  if (value !== expected) problems.push(message);
}

function requireSafeRelativePath(value: unknown, field: string, problems: string[]): void {
  requireString(value, field, problems);
  if (typeof value === 'string' && (path.isAbsolute(value) || value.includes('..'))) {
    problems.push(`${field} must be a relative path without .. segments.`);
  }
}
