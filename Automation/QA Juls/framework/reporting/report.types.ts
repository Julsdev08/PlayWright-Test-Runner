export const failureClassifications = [
  'Confirmed application defect',
  'Likely application defect requiring manual confirmation',
  'Automation-code failure',
  'Environment or configuration failure',
  'Test-data failure',
  'Third-party failure',
  'Blocked by missing requirements',
  'Potential flaky result'
] as const;

export type FailureClassification = (typeof failureClassifications)[number];
export type ExecutionStatus = 'Passed' | 'Failed' | 'Blocked' | 'Skipped';

export type QaExecutionResult = {
  testId: string;
  pageOrFeature: string;
  status: ExecutionStatus;
  classification?: FailureClassification;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  preconditions: string[];
  reproductionSteps: string[];
  expectedResult: string;
  actualResult: string;
  device: string;
  browser: string;
  evidencePaths: string[];
  consoleEvidence?: string[];
  networkEvidence?: string[];
  recommendedNextAction: string;
};

export type QaExecutionInput = {
  projectName: string;
  environment: string;
  executionDate: string;
  scopeTested: string[];
  devicesAndBrowsers: string[];
  results: QaExecutionResult[];
};

export type QaSummary = QaExecutionInput & {
  totals: Record<ExecutionStatus, number>;
};

