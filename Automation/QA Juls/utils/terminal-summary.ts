import { TestCounters } from './types';

export function printTerminalSummary(summary: TestCounters): void {
  const seconds = (summary.executionTimeMs / 1000).toFixed(2);
  console.log('\nQA Automation Summary');
  console.log('---------------------');
  console.log(`Pages Tested: ${summary.pagesTested}`);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Visual Issues: ${summary.visualIssues}`);
  console.log(`Functional Issues: ${summary.functionalIssues}`);
  console.log(`Responsive Issues: ${summary.responsiveIssues}`);
  console.log(`Image Issues: ${summary.imageIssues}`);
  console.log(`Accessibility Issues: ${summary.accessibilityIssues}`);
  console.log(`Performance Warnings: ${summary.performanceWarnings}`);
  console.log(`Console Errors: ${summary.consoleErrors}`);
  console.log(`Network Errors: ${summary.networkErrors}`);
  console.log(
    `Issues by Severity: Critical ${summary.severity.Critical}, High ${summary.severity.High}, Medium ${summary.severity.Medium}, Low ${summary.severity.Low}`
  );
  console.log(`Execution Time: ${seconds}s\n`);
}
