import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
import JSZip from 'jszip';

const options = parseArguments(process.argv.slice(2));
const templatePath = required(options, 'template');
const resultsPath = required(options, 'results');
const outputPath = required(options, 'output');
const baseURL = options['base-url'] ?? '';
const owner = options.owner ?? 'QA Automation';
const sheetName = options.sheet ?? 'Review Log QA';

const input = await FileBlob.load(templatePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem(sheetName);
const results = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
if (!Array.isArray(results.results)) throw new Error('Execution results must contain a results array.');
if (results.results.length > 1059) throw new Error('Review Log QA template supports at most 1,059 result rows.');

const expectedHeaders = [
  'ID', 'Page / URL', 'Device', 'Section / Element', 'Severity', 'Owner / Role',
  'Issue / What to do:', 'Screenshot/\nRecording', 'Notes / Routing', 'Reference', 'Status', 'QA Comments'
];
const actualHeaders = sheet.getRange('A1:L1').values[0].map((value) => String(value ?? ''));
if (JSON.stringify(actualHeaders) !== JSON.stringify(expectedHeaders)) {
  throw new Error('Excel template headers do not match the expected Review Log QA format.');
}

const rows = results.results.map((result) => [
  result.testId,
  baseURL,
  result.device,
  result.pageOrFeature,
  result.severity,
  owner,
  result.status === 'Passed'
    ? `Verified: ${result.expectedResult}`
    : `${result.actualResult} Next: ${result.recommendedNextAction}`,
  (result.evidencePaths ?? []).join('\n'),
  `Classification: ${result.classification ?? 'Not applicable'}\nPriority: ${result.priority}`,
  (result.reproductionSteps ?? []).join('\n'),
  result.status === 'Passed'
    ? 'Tested/QA Pass'
    : result.status === 'Blocked' || result.status === 'Skipped'
      ? 'Awaiting spec'
      : 'Open',
  `Expected: ${result.expectedResult}\nActual: ${result.actualResult}\nRecommended: ${result.recommendedNextAction}`,
]);

if (rows.length > 0) {
  const range = sheet.getRange(`A2:L${rows.length + 1}`);
  range.values = rows;
  range.format.wrapText = true;
  range.format.autofitRows();
}

sheet.freezePanes.freezeRows(1);
const statusRange = sheet.getRange('K2:K1060');
statusRange.dataValidation = {
  rule: {
    type: 'list',
    values: ['Awaiting spec', 'Open', 'For QA', 'Tested/QA Pass', 'Design Assets Provided']
  }
};
statusRange.conditionalFormats.deleteAll();
statusRange.conditionalFormats.add('containsText', {
  text: 'Awaiting spec',
  format: { fill: '#FEF3C7', font: { color: '#92400E' } }
});
statusRange.conditionalFormats.add('containsText', {
  text: 'Open',
  format: { fill: '#FECACA', font: { color: '#991B1B' } }
});
statusRange.conditionalFormats.add('containsText', {
  text: 'For QA',
  format: { fill: '#DBEAFE', font: { color: '#1E40AF' } }
});
statusRange.conditionalFormats.add('containsText', {
  text: 'Tested/QA Pass',
  format: { fill: '#DCFCE7', font: { color: '#166534' } }
});
statusRange.conditionalFormats.add('containsText', {
  text: 'Design Assets Provided',
  format: { fill: '#EDE9FE', font: { color: '#5B21B6' } }
});

const filterLastRow = Math.max(2, rows.length + 1);
const table = sheet.tables.add(`A1:L${filterLastRow}`, true, 'ReviewLogQATable');
table.style = 'TableStyleLight1';
table.showFilterButton = true;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await restoreFrozenHeader(outputPath);
console.log(JSON.stringify({ outputPath, rowsWritten: rows.length }));

async function restoreFrozenHeader(filePath) {
  // artifact-tool currently does not serialize freeze panes when exporting XLSX.
  const zip = await JSZip.loadAsync(await fs.readFile(filePath));
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const sheetFile = zip.file(sheetPath);
  if (!sheetFile) throw new Error(`Unable to restore the frozen header: ${sheetPath} is missing.`);

  let xml = await sheetFile.async('string');
  xml = xml.replace(/<x:sheetViews>[\s\S]*?<\/x:sheetViews>/, '');
  const worksheetTag = xml.match(/<x:worksheet\b[^>]*>/)?.[0];
  if (!worksheetTag) throw new Error('Unable to restore the frozen header: worksheet root is missing.');

  const spreadsheetNamespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const frozenView = `<sheetViews xmlns="${spreadsheetNamespace}"><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>`;
  xml = xml.replace(worksheetTag, `${worksheetTag}${frozenView}`);
  zip.file(sheetPath, xml);
  await fs.writeFile(filePath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

function parseArguments(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const value = values[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}.`);
    parsed[key.slice(2)] = value;
    index += 1;
  }
  return parsed;
}

function required(values, name) {
  const value = values[name];
  if (!value) throw new Error(`Missing required option --${name}.`);
  return value;
}
