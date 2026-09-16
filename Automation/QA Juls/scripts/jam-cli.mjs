import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const configured = process.env.JAM_CLI_PATH?.trim();
const localInstall = path.join(os.homedir(), '.local', 'bin', 'jam');
const command = configured || (fs.existsSync(localInstall) ? localInstall : 'jam');
const result = spawnSync(command, process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
});

if (result.error) {
  console.error(`Unable to run Jam CLI (${command}): ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
