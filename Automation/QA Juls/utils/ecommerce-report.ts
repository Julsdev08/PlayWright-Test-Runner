import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { TestInfo } from '@playwright/test';
import { EcommerceScenario } from '../data/ecommerce-scenarios';
import { redactSecrets } from './test-data';

export type EcommerceValidationStatus = 'Passed' | 'Failed' | 'Skipped' | 'Needs Manual Verification';

export type EcommerceValidationResult = {
  testId: string;
  title: string;
  flow: string;
  priority: string;
  automationFeasibility: string;
  preconditions: string;
  testData: string;
  steps: string;
  expectedResult: string;
  observedResult: string;
  validationStatus: EcommerceValidationStatus;
  failureReason: string;
  project: string;
  browser: string;
  executionDate: string;
  evidenceLocation: string;
};

const results: EcommerceValidationResult[] = [];

export function recordScenarioResult(
  scenario: EcommerceScenario,
  testInfo: TestInfo,
  observedResult = 'Scenario completed with expected assertions.'
): void {
  const failed = testInfo.status !== testInfo.expectedStatus;
  const skipped = testInfo.status === 'skipped';
  const status: EcommerceValidationStatus = skipped ? 'Skipped' : failed ? 'Failed' : 'Passed';
  const errorText = testInfo.error?.message ? redactSecrets(testInfo.error.message) : '';

  results.push({
    testId: scenario.id,
    title: scenario.title,
    flow: scenario.flow,
    priority: scenario.priority,
    automationFeasibility: scenario.automationFeasibility,
    preconditions: scenario.preconditions.join('\n'),
    testData: scenario.testData,
    steps: scenario.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    expectedResult: scenario.expectedResult,
    observedResult: failed ? 'Scenario did not meet one or more assertions.' : observedResult,
    validationStatus: status,
    failureReason: errorText,
    project: testInfo.project.name,
    browser: testInfo.project.use.browserName ?? 'unknown',
    executionDate: new Date().toISOString(),
    evidenceLocation: path.relative(process.cwd(), testInfo.outputDir)
  });
}

export async function writeEcommerceReports(): Promise<{ jsonPath: string; excelPath: string } | undefined> {
  if (results.length === 0) {
    return undefined;
  }

  const outputDir = path.resolve('reports/ecommerce');
  fs.mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outputDir, `ecommerce-validation-${timestamp}.json`);
  const excelPath = path.join(outputDir, `ecommerce-validation-${timestamp}.xlsx`);

  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI QA Automation Framework';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Ecommerce Validation');
  sheet.columns = [
    { header: 'Test ID', key: 'testId', width: 16 },
    { header: 'Title', key: 'title', width: 42 },
    { header: 'Flow', key: 'flow', width: 18 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Automation Feasibility', key: 'automationFeasibility', width: 28 },
    { header: 'Preconditions', key: 'preconditions', width: 42 },
    { header: 'Test Data', key: 'testData', width: 34 },
    { header: 'Steps', key: 'steps', width: 52 },
    { header: 'Expected Result', key: 'expectedResult', width: 52 },
    { header: 'Observed Result', key: 'observedResult', width: 52 },
    { header: 'Validation Status', key: 'validationStatus', width: 18 },
    { header: 'Failure Reason', key: 'failureReason', width: 42 },
    { header: 'Project', key: 'project', width: 18 },
    { header: 'Browser', key: 'browser', width: 14 },
    { header: 'Execution Date', key: 'executionDate', width: 26 },
    { header: 'Evidence Location', key: 'evidenceLocation', width: 50 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:P1';
  results.forEach((result) => sheet.addRow(result));

  for (const row of sheet.getRows(2, sheet.rowCount - 1) ?? []) {
    row.alignment = { vertical: 'top', wrapText: true };
  }

  await workbook.xlsx.writeFile(excelPath);
  return { jsonPath, excelPath };
}
