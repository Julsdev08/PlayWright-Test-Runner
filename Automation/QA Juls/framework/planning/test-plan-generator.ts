import { WebsiteProjectConfig } from '../config/project-config.types';
import { ProposedTestCase, ProposedTestPlan } from './test-case.types';

export function generateTestPlan(config: WebsiteProjectConfig, generatedAt = new Date().toISOString()): ProposedTestPlan {
  const devices = config.browserProjects.filter((project) => project.enabled).map((project) => project.name);
  const questions: string[] = [];

  if (config.authentication.required && config.authentication.approvedTestAccounts.length === 0) {
    questions.push('Which approved test accounts and roles may be used for authenticated coverage?');
  }
  if (config.testingScope.some((item) => /form/i.test(item)) && config.formsAllowedForSubmission.length === 0) {
    questions.push('Which forms, if any, are approved for submission? Discovery will inspect forms without submitting them.');
  }
  if (config.websiteType === 'e-commerce' && !config.testingScope.some((item) => /payment|transaction|checkout/i.test(item))) {
    questions.push('Are checkout, payment, and order-creation scenarios in scope, and which test gateway may be used?');
  }

  const tests: ProposedTestCase[] = [
    {
      testId: 'DISC-001',
      pageOrFeature: 'Approved target',
      scenario: 'Confirm the configured website is reachable without modifying data',
      preconditions: ['Project configuration is valid', 'The approved target environment is available'],
      steps: ['Request the configured base URL', 'Record the response and final URL', 'Do not submit forms or follow external links'],
      expectedResult: 'The approved target returns a successful document response and remains on an allowed domain.',
      priority: 'P0',
      severityIfFailed: 'Critical',
      devices,
      testType: 'Discovery',
      tags: ['@smoke', '@discovery'],
      automationSuitability: 'Automated',
      dataRequirements: 'None',
      actionCategory: 'read-only',
      approvalRequired: false
    }
  ];

  config.includedPages.forEach((pagePath, index) => {
    tests.push({
      testId: `NAV-${String(index + 1).padStart(3, '0')}`,
      pageOrFeature: pagePath,
      scenario: 'Open an approved page and verify it remains within configured scope',
      preconditions: ['The approved target is reachable', `${pagePath} is explicitly included in scope`],
      steps: [`Navigate to ${pagePath}`, 'Record the final URL and document response', 'Observe console and failed network requests'],
      expectedResult: 'The page loads without leaving the allowed domain. Business-specific content expectations require QA confirmation.',
      priority: pagePath === '/' ? 'P0' : 'P1',
      severityIfFailed: pagePath === '/' ? 'High' : 'Medium',
      devices,
      testType: 'Navigation and links',
      tags: [pagePath === '/' ? '@smoke' : '@regression', '@navigation'],
      automationSuitability: 'Automated',
      dataRequirements: 'None',
      actionCategory: 'read-only',
      approvalRequired: false
    });
  });

  return {
    schemaVersion: 1,
    projectName: config.projectName,
    projectSlug: config.projectSlug,
    generatedAt,
    scope: [...config.testingScope],
    questions,
    tests
  };
}

export function renderTestPlanMarkdown(plan: ProposedTestPlan): string {
  const lines = [
    `# Test Plan: ${plan.projectName}`,
    '',
    `Generated: ${plan.generatedAt}`,
    '',
    '## Scope',
    '',
    ...plan.scope.map((item) => `- ${item}`),
    '',
    '## Questions requiring QA confirmation',
    '',
    ...(plan.questions.length ? plan.questions.map((question) => `- ${question}`) : ['- None recorded.']),
    '',
    '## Proposed tests',
    ''
  ];

  for (const testCase of plan.tests) {
    lines.push(
      `### ${testCase.testId} — ${testCase.scenario}`,
      '',
      `- Page or feature: ${testCase.pageOrFeature}`,
      `- Priority: ${testCase.priority}`,
      `- Severity if failed: ${testCase.severityIfFailed}`,
      `- Device projects: ${testCase.devices.join(', ')}`,
      `- Type: ${testCase.testType}`,
      `- Tags: ${testCase.tags.join(' ')}`,
      `- Action class: ${testCase.actionCategory}`,
      `- Approval required: ${testCase.approvalRequired ? 'Yes' : 'No'}`,
      `- Expected: ${testCase.expectedResult}`,
      ''
    );
  }
  return `${lines.join('\n')}\n`;
}

