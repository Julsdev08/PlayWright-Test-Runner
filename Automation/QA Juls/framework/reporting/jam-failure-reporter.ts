import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult
} from '@playwright/test/reporter';

type ReporterOptions = {
  output: string;
  baseURL?: string;
};

type FinalAttempt = {
  test: TestCase;
  result: TestResult;
};

type JamReceipt = {
  testId: string;
  title: string;
  status: 'created' | 'dry-run' | 'skipped' | 'failed';
  url?: string;
  jamId?: string;
  reason?: string;
  payload?: JamVideoPayload;
};

type JamVideoPayload = {
  kind: 'video';
  url: string;
  title: string;
  description: string;
  videoPath: string;
  playwrightTracePath?: string;
  posterImagePath?: string;
  screenDimensions: { width: number; height: number };
  durationMs: number;
  width: number;
  height: number;
  viewport: 'tab';
  recordingSurface: 'browser_tab';
  micEnabled: false;
};

export default class JamFailureReporter implements Reporter {
  private readonly finalAttempts = new Map<string, FinalAttempt>();
  private rootDir = process.cwd();

  constructor(private readonly options: ReporterOptions) {}

  onBegin(config: FullConfig): void {
    this.rootDir = config.rootDir ? path.dirname(config.rootDir) : process.cwd();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const projectName = test.parent.project()?.name ?? 'unknown-project';
    this.finalAttempts.set(`${projectName}:${test.id}`, { test, result });
  }

  onEnd(_fullResult: FullResult): void {
    if (process.env.JAM_AUTO_CREATE !== 'true') return;

    const outputPath = path.resolve(this.rootDir, this.options.output);
    const maxUploads = positiveInteger(process.env.JAM_MAX_FAILURE_JAMS, 5);
    const dryRun = process.env.JAM_AUTO_CREATE_DRY_RUN === 'true';
    const receipts: JamReceipt[] = [];
    let attemptedUploads = 0;

    for (const { test, result } of this.finalAttempts.values()) {
      if (result.status !== 'failed' && result.status !== 'timedOut') continue;

      const projectName = test.parent.project()?.name ?? 'unknown-project';
      const title = truncate(
        `[${projectName}] ${annotation(test, 'jam:title') ?? cleanTestTitle(test.title)}`,
        255
      );
      if (attemptedUploads >= maxUploads) {
        receipts.push({
          testId: test.id,
          title,
          status: 'skipped',
          reason: `Run limit reached (${maxUploads}).`
        });
        continue;
      }

      const video = findAttachment(result, 'video/');
      if (!video) {
        receipts.push({
          testId: test.id,
          title,
          status: 'skipped',
          reason: 'No retained failure video was produced.'
        });
        continue;
      }

      const screenshot = findAttachment(result, 'image/');
      if (!screenshot) {
        receipts.push({
          testId: test.id,
          title,
          status: 'skipped',
          reason: 'No failure screenshot was produced for the Jam poster image.'
        });
        continue;
      }

      const project = test.parent.project();
      const viewport = project?.use.viewport;
      const width = viewport?.width ?? 1280;
      const height = viewport?.height ?? 720;
      const trace = result.attachments.find((item) => item.name === 'trace' && item.path && fs.existsSync(item.path));
      const relativeFile = path.relative(this.rootDir, test.location.file);
      const payload: JamVideoPayload = {
        kind: 'video',
        url: this.options.baseURL ?? '',
        title,
        description: buildDescription(test, result, {
          affectedUrl: this.options.baseURL ?? '',
          projectName: project?.name ?? 'unknown-project',
          relativeFile
        }),
        videoPath: video,
        playwrightTracePath: trace?.path,
        posterImagePath: screenshot,
        screenDimensions: { width, height },
        durationMs: Math.max(1, Math.round(result.duration)),
        width,
        height,
        viewport: 'tab',
        recordingSurface: 'browser_tab',
        micEnabled: false
      };

      attemptedUploads += 1;

      if (dryRun) {
        receipts.push({ testId: test.id, title, status: 'dry-run', payload });
        continue;
      }

      try {
        const cliPath = resolveJamCli();
        const args = ['--json', 'create', 'jam', JSON.stringify(payload)];
        const folder = process.env.JAM_FOLDER?.trim();
        if (folder) args.push('--folder', folder);
        const stdout = execFileSync(cliPath, args, {
          cwd: this.rootDir,
          encoding: 'utf8',
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        const response = JSON.parse(stdout) as { id?: string; jamId?: string; url?: string };
        const url = response.url;
        receipts.push({
          testId: test.id,
          title,
          status: 'created',
          url,
          jamId: response.id ?? response.jamId
        });
        console.log(`Jam failure evidence: ${url ?? response.id ?? response.jamId ?? 'created'}`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        receipts.push({ testId: test.id, title, status: 'failed', reason });
        console.error(`Failed to create Jam for "${test.title}": ${reason}`);
      }
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ createdAt: new Date().toISOString(), receipts }, null, 2));
    console.log(`Jam failure receipts: ${outputPath}`);
  }
}

function findAttachment(result: TestResult, contentTypePrefix: string): string | undefined {
  return result.attachments.find((item) =>
    item.path && item.contentType.startsWith(contentTypePrefix) && fs.existsSync(item.path)
  )?.path;
}

function resolveJamCli(): string {
  const configured = process.env.JAM_CLI_PATH?.trim();
  if (configured) return configured;

  const localInstall = path.join(os.homedir(), '.local', 'bin', 'jam');
  if (fs.existsSync(localInstall)) return localInstall;
  return 'jam';
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function annotation(test: TestCase, type: string): string | undefined {
  return test.annotations.find((item) => item.type === type)?.description?.trim() || undefined;
}

function cleanTestTitle(title: string): string {
  return title
    .replace(/^[A-Z][A-Z0-9-]*-\d+\s+/, '')
    .replace(/\s+@[a-z0-9_-]+/gi, '')
    .trim();
}

function errorSummary(result: TestResult): string {
  const raw = result.error?.message?.trim() || `The automated check ended with status: ${result.status}.`;
  return raw.replace(/^Error:\s*/i, '').split('\n')[0];
}

function buildDescription(
  test: TestCase,
  result: TestResult,
  context: { affectedUrl: string; projectName: string; relativeFile: string }
): string {
  const steps = annotation(test, 'jam:steps') ?? [
    `1. Open ${context.affectedUrl || 'the affected page'}.`,
    `2. Perform the scenario: ${cleanTestTitle(test.title)}.`,
    '3. Observe the failure shown in the attached recording.'
  ].join('\n');
  const expected = annotation(test, 'jam:expected') ?? 'The scenario completes with the expected user-facing behavior.';
  const actual = annotation(test, 'jam:actual') ?? errorSummary(result);
  const recommendedFix = annotation(test, 'jam:fix') ??
    'Investigate the failing UI flow, restore the expected behavior, and verify it with the attached regression scenario.';

  return [
    '## Issue',
    errorSummary(result),
    '',
    '## Steps to reproduce',
    steps,
    '',
    '## Expected behavior',
    expected,
    '',
    '## Actual behavior',
    actual,
    '',
    '## Recommended fix',
    recommendedFix,
    '',
    '## Test evidence',
    `- Environment: ${context.affectedUrl || 'Not provided'}`,
    `- Browser profile: ${context.projectName}`,
    `- Regression test: ${context.relativeFile}:${test.location.line}`,
    `- Re-run: npx playwright test "${context.relativeFile}:${test.location.line}" --project="${context.projectName}"`
  ].join('\n');
}
