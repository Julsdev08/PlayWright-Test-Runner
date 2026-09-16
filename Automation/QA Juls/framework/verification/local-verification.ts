import fs from 'fs';
import path from 'path';
import { evaluateApproval } from '../approval/approval-gate';
import { ApprovalManifest } from '../approval/approval.types';
import { loadProjectConfig, resolveConfiguredBaseURL } from '../config/project-config.loader';
import { WebsiteProjectConfig } from '../config/project-config.types';
import { generateTestPlan, renderTestPlanMarkdown } from '../planning/test-plan-generator';
import { ProposedTestCase } from '../planning/test-case.types';
import { QaExecutionInput } from '../reporting/report.types';
import { writeQaSummary } from '../reporting/qa-summary';
import { evaluateTargetURL } from '../safety/domain-policy';

export type LocalVerificationResult = {
  projectName: string;
  baseURL: string;
  proposedTests: number;
  safeReadOnlyAllowed: boolean;
  writeWithoutApprovalBlocked: boolean;
  productionWriteBlocked: boolean;
  externalDomainBlocked: boolean;
  planJsonPath: string;
  planMarkdownPath: string;
  reportJsonPath: string;
  reportMarkdownPath: string;
};

export function verifyLocalFramework(root = process.cwd()): LocalVerificationResult {
  const config = loadProjectConfig('local-example', root);
  const baseURL = resolveConfiguredBaseURL(config);
  if (!baseURL) throw new Error('Local example must define a baseURL.');

  const outputDirectory = path.resolve(root, 'reports/framework-verification');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const plan = generateTestPlan(config, '2026-01-01T00:00:00.000Z');
  const planJsonPath = path.join(outputDirectory, 'test-plan.json');
  const planMarkdownPath = path.join(outputDirectory, 'test-plan.md');
  fs.writeFileSync(planJsonPath, `${JSON.stringify(plan, null, 2)}\n`);
  fs.writeFileSync(planMarkdownPath, renderTestPlanMarkdown(plan));

  const readOnly = plan.tests[0];
  const safeReadOnlyAllowed = evaluateApproval(readOnly, config).allowed;
  const writeCase: ProposedTestCase = {
    ...readOnly,
    testId: 'FORM-001',
    scenario: 'Submit a form',
    actionCategory: 'data-creating',
    approvalRequired: true
  };
  const writeWithoutApprovalBlocked = !evaluateApproval(writeCase, allowDataCreation(config)).allowed;

  const manifest: ApprovalManifest = {
    schemaVersion: 1,
    projectSlug: config.projectSlug,
    approvedAt: '2026-01-01T00:00:00.000Z',
    approvedTestIds: ['FORM-001'],
    approvedActionCategories: ['data-creating'],
    productionWriteApproved: true
  };
  const productionConfig: WebsiteProjectConfig = {
    ...allowDataCreation(config),
    testEnvironment: 'production',
    productionSafety: { ...config.productionSafety, allowWriteActions: false }
  };
  const productionWriteBlocked = !evaluateApproval(writeCase, productionConfig, manifest).allowed;
  const externalDomainBlocked = !evaluateTargetURL('https://external.example/', config).allowed;

  const execution: QaExecutionInput = {
    projectName: config.projectName,
    environment: config.testEnvironment,
    executionDate: '2026-01-01T00:00:00.000Z',
    scopeTested: config.testingScope,
    devicesAndBrowsers: config.browserProjects.filter((project) => project.enabled).map((project) => project.name),
    results: [
      {
        testId: readOnly.testId,
        pageOrFeature: readOnly.pageOrFeature,
        status: 'Passed',
        severity: readOnly.severityIfFailed,
        priority: readOnly.priority,
        preconditions: readOnly.preconditions,
        reproductionSteps: readOnly.steps,
        expectedResult: readOnly.expectedResult,
        actualResult: 'Local verification simulated a successful read-only result. No browser was started.',
        device: 'configuration-only',
        browser: 'not started',
        evidencePaths: [planJsonPath],
        recommendedNextAction: 'Proceed to localhost discovery only after the discovery stage is implemented.'
      },
      {
        testId: writeCase.testId,
        pageOrFeature: 'Example form',
        status: 'Blocked',
        classification: 'Blocked by missing requirements',
        severity: 'High',
        priority: 'P1',
        preconditions: ['Explicit approval is required'],
        reproductionSteps: ['Evaluate the write test without an approval manifest'],
        expectedResult: 'The approval gate blocks the action.',
        actualResult: 'The action was blocked before execution.',
        device: 'configuration-only',
        browser: 'not started',
        evidencePaths: [],
        recommendedNextAction: 'Provide an approval manifest only when the exact form and data policy are confirmed.'
      }
    ]
  };
  const reportPaths = writeQaSummary(execution, outputDirectory);

  const checks = [safeReadOnlyAllowed, writeWithoutApprovalBlocked, productionWriteBlocked, externalDomainBlocked];
  if (checks.some((check) => !check)) throw new Error('One or more local safety verification checks failed.');

  return {
    projectName: config.projectName,
    baseURL,
    proposedTests: plan.tests.length,
    safeReadOnlyAllowed,
    writeWithoutApprovalBlocked,
    productionWriteBlocked,
    externalDomainBlocked,
    planJsonPath,
    planMarkdownPath,
    reportJsonPath: reportPaths.jsonPath,
    reportMarkdownPath: reportPaths.markdownPath
  };
}

function allowDataCreation(config: WebsiteProjectConfig): WebsiteProjectConfig {
  return {
    ...config,
    actions: {
      allowed: [...config.actions.allowed, 'data-creating'],
      prohibited: config.actions.prohibited.filter((action) => action !== 'data-creating')
    }
  };
}

