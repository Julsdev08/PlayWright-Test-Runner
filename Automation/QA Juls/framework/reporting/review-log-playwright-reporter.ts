import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult
} from '@playwright/test/reporter';

type ReporterOptions = {
  template: string;
  output: string;
  results?: string;
  sheet?: string;
  owner?: string;
  baseURL?: string;
};

type ReviewLogResult = {
  testId: string;
  pageOrFeature: string;
  status: 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
  classification?: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  preconditions: string[];
  reproductionSteps: string[];
  expectedResult: string;
  actualResult: string;
  device: string;
  browser: string;
  evidencePaths: string[];
  recommendedNextAction: string;
};

export default class ReviewLogPlaywrightReporter implements Reporter {
  private readonly results: ReviewLogResult[] = [];
  private rootDir = process.cwd();

  constructor(private readonly options: ReporterOptions) {}

  onBegin(config: FullConfig): void {
    this.rootDir = config.rootDir ? path.dirname(config.rootDir) : process.cwd();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const projectName = test.parent.project()?.name ?? 'unknown-project';
    const tags = new Set(test.tags.map((tag) => tag.toLowerCase()));
    const status = mapStatus(result.status);
    const severity = severityAnnotation(test) ?? severityFromTags(tags);
    const expected = annotation(test, 'expected') ?? `The test passes: ${test.title}`;
    const failure = result.errors.map((error) => error.message).filter(Boolean).join('\n');
    const actual = status === 'Passed'
      ? 'Test passed.'
      : status === 'Skipped'
        ? 'Test was skipped by Playwright.'
        : failure || `Test finished with status: ${result.status}.`;
    const relativeFile = path.relative(this.rootDir, test.location.file);

    this.results.push({
      testId: annotation(test, 'testId') ?? test.title.match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+\b/)?.[0] ?? test.id,
      pageOrFeature: annotation(test, 'feature') ?? test.titlePath().slice(-2, -1)[0] ?? path.basename(relativeFile),
      status,
      classification: status === 'Failed' ? 'Requires application/automation triage' : undefined,
      severity,
      priority: priorityFromTags(tags, severity),
      preconditions: [],
      reproductionSteps: [
        `npx playwright test "${relativeFile}:${test.location.line}" --project="${projectName}"`
      ],
      expectedResult: expected,
      actualResult: actual,
      device: projectName,
      browser: browserFromProject(projectName),
      evidencePaths: result.attachments.map((attachment) => attachment.path).filter((value): value is string => Boolean(value)),
      recommendedNextAction: status === 'Failed'
        ? 'Review the Playwright trace and failure evidence, then classify the issue as an application defect or automation-code failure.'
        : status === 'Skipped'
          ? 'Review why the test was skipped before treating the feature as covered.'
          : 'No action required.'
    });
  }

  onEnd(fullResult: FullResult): void {
    const resultsPath = path.resolve(this.rootDir, this.options.results ?? 'reports/qa/execution-results.json');
    const outputPath = path.resolve(this.rootDir, this.options.output);
    const templatePath = path.resolve(this.rootDir, this.options.template);
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const totals = countStatuses(this.results);
    fs.writeFileSync(resultsPath, JSON.stringify({
      projectName: 'Playwright test run',
      environment: process.env.TEST_ENV ?? 'local',
      executionDate: new Date().toISOString(),
      scopeTested: ['Tests selected by the Playwright command'],
      devicesAndBrowsers: [...new Set(this.results.map((result) => `${result.device} / ${result.browser}`))],
      results: this.results,
      totals,
      playwrightRunStatus: fullResult.status
    }, null, 2));

    try {
      execFileSync(process.execPath, [path.resolve(this.rootDir, 'scripts/setup-artifact-tool.mjs')], { stdio: 'inherit' });
      const exporterArguments = [
        path.resolve(this.rootDir, 'framework/reporting/review-log-export.mjs'),
        '--template', templatePath,
        '--results', resultsPath,
        '--output', outputPath,
        '--owner', this.options.owner ?? 'QA Automation',
        '--sheet', this.options.sheet ?? 'Review Log QA'
      ];
      if (this.options.baseURL) exporterArguments.push('--base-url', this.options.baseURL);
      execFileSync(process.execPath, exporterArguments, { stdio: 'inherit' });
      console.log(`Review Log QA Excel report: ${outputPath}`);
    } catch (error) {
      console.error('Failed to create the Review Log QA Excel report.', error);
      throw error;
    }
  }
}

function annotation(test: TestCase, type: string): string | undefined {
  return test.annotations.find((item) => item.type.toLowerCase() === type.toLowerCase())?.description;
}

function severityAnnotation(test: TestCase): ReviewLogResult['severity'] | undefined {
  const value = annotation(test, 'severity');
  if (value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low') return value;
  return undefined;
}

function mapStatus(status: TestResult['status']): ReviewLogResult['status'] {
  if (status === 'passed') return 'Passed';
  if (status === 'skipped') return 'Skipped';
  return 'Failed';
}

function severityFromTags(tags: Set<string>): ReviewLogResult['severity'] {
  if (tags.has('@critical')) return 'Critical';
  if (tags.has('@smoke')) return 'High';
  if (tags.has('@regression')) return 'Medium';
  return 'Medium';
}

function priorityFromTags(tags: Set<string>, severity: ReviewLogResult['severity']): ReviewLogResult['priority'] {
  if (severity === 'Critical' || tags.has('@critical')) return 'P0';
  if (severity === 'High' || tags.has('@smoke')) return 'P1';
  if (severity === 'Medium' || tags.has('@regression')) return 'P2';
  return 'P3';
}

function browserFromProject(projectName: string): string {
  if (projectName.toLowerCase().includes('chromium')) return 'Chromium';
  if (projectName.toLowerCase().includes('firefox')) return 'Firefox';
  if (projectName.toLowerCase().includes('webkit')) return 'WebKit';
  return projectName;
}

function countStatuses(results: ReviewLogResult[]): Record<ReviewLogResult['status'], number> {
  return results.reduce<Record<ReviewLogResult['status'], number>>((totals, result) => {
    totals[result.status] += 1;
    return totals;
  }, { Passed: 0, Failed: 0, Blocked: 0, Skipped: 0 });
}
