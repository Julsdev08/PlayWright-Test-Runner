export type TestType = 'Visual' | 'Responsive' | 'Functional' | 'Image' | 'Accessibility' | 'Performance' | 'Console' | 'Network';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Status = 'Passed' | 'Failed' | 'Warning';

export type QaIssue = {
  testId: string;
  page: string;
  url: string;
  area: string;
  component: string;
  viewport: string;
  browser: string;
  testType: TestType;
  severity: Severity;
  status: Status;
  issueSummary: string;
  actualResult: string;
  expectedResult: string;
  stepsToReproduce: string;
  consoleError?: string;
  networkError?: string;
  dateTested: string;
};

export type IssueInput = Omit<QaIssue, 'testId' | 'dateTested'>;

export type TestCounters = {
  pagesTested: number;
  totalTests: number;
  passed: number;
  failed: number;
  visualIssues: number;
  functionalIssues: number;
  responsiveIssues: number;
  imageIssues: number;
  accessibilityIssues: number;
  performanceWarnings: number;
  consoleErrors: number;
  networkErrors: number;
  severity: Record<Severity, number>;
  executionTimeMs: number;
};
