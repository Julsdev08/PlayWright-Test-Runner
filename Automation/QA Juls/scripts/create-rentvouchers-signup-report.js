const ExcelJS = require('exceljs');
const path = require('path');

async function main() {
  const rows = [];
  const executionDate = new Date().toISOString();
  const url = 'https://rentvouchers.com/coming-soon';
  const area = 'Signup / Coming Soon early access form';

  function add({
    testId,
    title,
    device,
    browser,
    status,
    observedResult,
    expectedResult,
    qaComments,
    evidenceLocation = ''
  }) {
    rows.push({
      testId,
      title,
      url,
      area,
      severity: status === 'Fail' ? 'High' : 'Medium',
      device,
      browser,
      expectedResult,
      observedResult,
      validationStatus: status,
      qaComments,
      executionDate,
      evidenceLocation
    });
  }

  const emailCases = ['missing at sign', 'missing local part', 'missing domain', 'spaces included', 'double at signs'];
  const devices = [
    { device: 'Desktop', browser: 'desktop-chromium', responsiveId: 'SIGNUP-016', responsiveTitle: 'Desktop responsiveness' },
    { device: 'Mobile', browser: 'mobile-chromium', responsiveId: 'SIGNUP-017', responsiveTitle: 'Mobile responsiveness' }
  ];

  for (const item of devices) {
    add({
      testId: 'SIGNUP-002',
      title: 'Required-field validation',
      device: item.device,
      browser: item.browser,
      status: 'Pass',
      observedResult: 'Empty required form submission is blocked by validation.',
      expectedResult: 'Required fields should prevent submission and show validation feedback.',
      qaComments: 'Passed. Browser/native required validation is working.'
    });

    for (const emailCase of emailCases) {
      add({
        testId: 'SIGNUP-003',
        title: `Email format edge case - ${emailCase}`,
        device: item.device,
        browser: item.browser,
        status: 'Pass',
        observedResult: 'Invalid email value is rejected.',
        expectedResult: 'Invalid email formats should not be accepted.',
        qaComments: 'Passed. Email format validation works for this case.'
      });
    }

    add({
      testId: 'SIGNUP-007',
      title: 'Terms and privacy consent',
      device: item.device,
      browser: item.browser,
      status: 'Pass',
      observedResult: 'Submission is blocked when terms/privacy consent is unchecked.',
      expectedResult: 'Terms/privacy consent should be required before submission.',
      qaComments: 'Passed. Consent validation is working.'
    });

    add({
      testId: item.responsiveId,
      title: item.responsiveTitle,
      device: item.device,
      browser: item.browser,
      status: 'Pass',
      observedResult: 'No horizontal overflow found and signup form remains usable.',
      expectedResult: 'Signup form should be usable without layout overflow on target viewport.',
      qaComments: 'Passed. Layout is usable on this viewport.'
    });

    add({
      testId: 'SIGNUP-018',
      title: 'Keyboard navigation',
      device: item.device,
      browser: item.browser,
      status: 'Pass',
      observedResult: 'Focusable controls are reachable and visible.',
      expectedResult: 'User should be able to navigate primary signup controls by keyboard.',
      qaComments: 'Passed. Primary controls are keyboard reachable.'
    });

    add({
      testId: 'SIGNUP-019',
      title: 'Accessibility using axe-core',
      device: item.device,
      browser: item.browser,
      status: 'Fail',
      observedResult: 'Axe found serious/critical accessibility violations.',
      expectedResult: 'No serious or critical automated accessibility violations should be detected.',
      qaComments:
        'Failed. Color contrast is below WCAG AA on active Tenant tab and bedroom chips. Hidden required bedrooms_hidden input has no accessible label.',
      evidenceLocation: `test-results/signup-signup-Ecommerce-si-59a54-ccessibility-using-axe-core-${item.browser}/trace.zip`
    });

    add({
      testId: 'SIGNUP-020',
      title: 'Basic client-side security handling',
      device: item.device,
      browser: item.browser,
      status: 'Pass',
      observedResult: 'Script-like input did not execute or create unsafe script nodes.',
      expectedResult: 'Script-like input should not execute in the page.',
      qaComments: 'Passed. Basic reflected script handling check did not detect execution.'
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Codex QA Automation';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('RentVouchers Signup QA');
  sheet.columns = [
    { header: 'Test ID', key: 'testId', width: 14 },
    { header: 'Title', key: 'title', width: 38 },
    { header: 'URL', key: 'url', width: 42 },
    { header: 'Area', key: 'area', width: 34 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Device', key: 'device', width: 12 },
    { header: 'Browser', key: 'browser', width: 18 },
    { header: 'Expected Result', key: 'expectedResult', width: 48 },
    { header: 'Observed Result', key: 'observedResult', width: 48 },
    { header: 'Validation Status', key: 'validationStatus', width: 18 },
    { header: 'QA Comments', key: 'qaComments', width: 58 },
    { header: 'Execution Date', key: 'executionDate', width: 26 },
    { header: 'Evidence Location', key: 'evidenceLocation', width: 70 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:M1';

  for (const result of rows) {
    const row = sheet.addRow(result);
    row.alignment = { vertical: 'top', wrapText: true };
    row.getCell('validationStatus').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: result.validationStatus === 'Fail' ? 'FFFCA5A5' : 'FFBBF7D0' }
    };
  }

  const outputPath = path.resolve('reports/ecommerce/rentvouchers-signup-qa-results-2026-07-12.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
