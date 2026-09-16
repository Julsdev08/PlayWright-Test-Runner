import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { QaIssue } from './types';

export async function writeExcelReport(issues: QaIssue[]): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI QA Automation Framework';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('QA Issues');
  sheet.columns = [
    { header: 'Test ID', key: 'testId', width: 12 },
    { header: 'Page', key: 'page', width: 20 },
    { header: 'URL', key: 'url', width: 45 },
    { header: 'Area', key: 'area', width: 18 },
    { header: 'Component', key: 'component', width: 24 },
    { header: 'Viewport', key: 'viewport', width: 18 },
    { header: 'Browser', key: 'browser', width: 14 },
    { header: 'Test Type', key: 'testType', width: 16 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Issue Summary', key: 'issueSummary', width: 42 },
    { header: 'Actual Result', key: 'actualResult', width: 48 },
    { header: 'Expected Result', key: 'expectedResult', width: 48 },
    { header: 'Steps to Reproduce', key: 'stepsToReproduce', width: 52 },
    { header: 'Console Error', key: 'consoleError', width: 42 },
    { header: 'Network Error', key: 'networkError', width: 42 },
    { header: 'Date Tested', key: 'dateTested', width: 26 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:Q1';

  for (const issue of issues) {
    sheet.addRow(issue);
  }

  for (const row of sheet.getRows(2, sheet.rowCount - 1) ?? []) {
    row.alignment = { vertical: 'top', wrapText: true };
  }

  const outputDir = path.resolve('reports/excel');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `qa-report-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`);
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}
