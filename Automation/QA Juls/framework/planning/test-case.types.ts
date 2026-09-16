import { ActionCategory } from '../config/project-config.types';

export type TestPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type FailureSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type AutomationSuitability = 'Automated' | 'Automated with support' | 'Manual' | 'Needs QA confirmation';

export type ProposedTestCase = {
  testId: string;
  pageOrFeature: string;
  scenario: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  priority: TestPriority;
  severityIfFailed: FailureSeverity;
  devices: string[];
  testType: string;
  tags: string[];
  automationSuitability: AutomationSuitability;
  dataRequirements: string;
  actionCategory: ActionCategory | 'blocked';
  approvalRequired: boolean;
  question?: string;
};

export type ProposedTestPlan = {
  schemaVersion: 1;
  projectName: string;
  projectSlug: string;
  generatedAt: string;
  scope: string[];
  questions: string[];
  tests: ProposedTestCase[];
};

