import fs from 'fs';
import path from 'path';
import { QaExecutionInput, QaSummary } from './report.types';

export function createQaSummary(input: QaExecutionInput): QaSummary {
  const totals = { Passed: 0, Failed: 0, Blocked: 0, Skipped: 0 };
  for (const result of input.results) totals[result.status] += 1;
  return { ...input, totals };
}

export function writeQaSummary(input: QaExecutionInput, outputDirectory: string): { jsonPath: string; markdownPath: string } {
  const summary = createQaSummary(input);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, 'qa-summary.json');
  const markdownPath = path.join(outputDirectory, 'qa-summary.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderQaSummaryMarkdown(summary));
  return { jsonPath, markdownPath };
}

export function renderQaSummaryMarkdown(summary: QaSummary): string {
  const confirmed = summary.results.filter((result) => result.classification === 'Confirmed application defect');
  const potential = summary.results.filter(
    (result) => result.classification === 'Likely application defect requiring manual confirmation'
  );
  const lines = [
    `# QA Summary: ${summary.projectName}`,
    '',
    '## Executive summary',
    '',
    `- Environment: ${summary.environment}`,
    `- Execution date: ${summary.executionDate}`,
    `- Passed: ${summary.totals.Passed}`,
    `- Failed: ${summary.totals.Failed}`,
    `- Blocked: ${summary.totals.Blocked}`,
    `- Skipped: ${summary.totals.Skipped}`,
    `- Confirmed defects: ${confirmed.length}`,
    `- Potential defects requiring review: ${potential.length}`,
    '',
    '## Scope tested',
    '',
    ...summary.scopeTested.map((item) => `- ${item}`),
    '',
    '## Devices and browsers',
    '',
    ...summary.devicesAndBrowsers.map((item) => `- ${item}`),
    '',
    '## Results',
    ''
  ];

  for (const result of summary.results) {
    lines.push(
      `### ${result.testId} — ${result.pageOrFeature}`,
      '',
      `- Status: ${result.status}`,
      `- Classification: ${result.classification ?? 'Not applicable'}`,
      `- Severity: ${result.severity}`,
      `- Priority: ${result.priority}`,
      `- Device/browser: ${result.device} / ${result.browser}`,
      `- Expected: ${result.expectedResult}`,
      `- Actual: ${result.actualResult}`,
      `- Evidence: ${result.evidencePaths.length ? result.evidencePaths.join(', ') : 'None'}`,
      `- Recommended next action: ${result.recommendedNextAction}`,
      '',
      'Reproduction steps:',
      '',
      ...result.reproductionSteps.map((step, index) => `${index + 1}. ${step}`),
      ''
    );
  }
  return `${lines.join('\n')}\n`;
}

