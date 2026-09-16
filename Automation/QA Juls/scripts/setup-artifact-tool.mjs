import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const source = process.env.CODEX_ARTIFACT_TOOL_PATH
  ?? path.join(
    os.homedir(),
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool'
  );
const targetDirectory = path.join(projectRoot, 'node_modules/@oai');
const target = path.join(targetDirectory, 'artifact-tool');

if (!fs.existsSync(source)) {
  throw new Error('Codex spreadsheet runtime was not found. Run this command from the Codex desktop environment.');
}
fs.mkdirSync(targetDirectory, { recursive: true });
if (!fs.existsSync(target)) fs.symlinkSync(source, target, 'dir');
console.log(target);

