import { IssueInput, QaIssue, Severity, TestCounters, TestType } from './types';

const prefixes: Record<TestType, string> = {
  Visual: 'VIS',
  Responsive: 'RESP',
  Functional: 'FUNC',
  Image: 'IMG',
  Accessibility: 'ACC',
  Performance: 'PERF',
  Console: 'CON',
  Network: 'NET'
};

export class IssueTracker {
  private issues: QaIssue[] = [];
  private counts = new Map<string, number>();
  private startedAt = Date.now();
  private pages = new Set<string>();
  private passed = 0;

  add(input: IssueInput): QaIssue {
    this.pages.add(input.page);
    const prefix = prefixes[input.testType];
    const next = (this.counts.get(prefix) ?? 0) + 1;
    this.counts.set(prefix, next);

    const issue: QaIssue = {
      ...input,
      testId: `${prefix}-${String(next).padStart(3, '0')}`,
      dateTested: new Date().toISOString()
    };

    this.issues.push(issue);
    return issue;
  }

  pass(page: string): void {
    this.pages.add(page);
    this.passed += 1;
  }

  all(): QaIssue[] {
    return [...this.issues];
  }

  summary(): TestCounters {
    const severity: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const issue of this.issues) {
      severity[issue.severity] += 1;
    }

    return {
      pagesTested: this.pages.size,
      totalTests: this.passed + this.issues.length,
      passed: this.passed,
      failed: this.issues.filter((issue) => issue.status === 'Failed').length,
      visualIssues: this.countByType('Visual'),
      functionalIssues: this.countByType('Functional'),
      responsiveIssues: this.countByType('Responsive'),
      imageIssues: this.countByType('Image'),
      accessibilityIssues: this.countByType('Accessibility'),
      performanceWarnings: this.countByType('Performance'),
      consoleErrors: this.countByType('Console'),
      networkErrors: this.countByType('Network'),
      severity,
      executionTimeMs: Date.now() - this.startedAt
    };
  }

  private countByType(testType: TestType): number {
    return this.issues.filter((issue) => issue.testType === testType).length;
  }
}
