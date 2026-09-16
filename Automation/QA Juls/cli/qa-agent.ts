import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { evaluateApproval } from '../framework/approval/approval-gate';
import { ApprovalManifest } from '../framework/approval/approval.types';
import {
  loadProjectConfig,
  resolveConfiguredBaseURL,
  resolveProjectDirectory
} from '../framework/config/project-config.loader';
import { createProjectScaffold } from '../framework/config/project-onboarding';
import { WebsiteType, websiteTypes } from '../framework/config/project-config.types';
import { generateTestPlan, renderTestPlanMarkdown } from '../framework/planning/test-plan-generator';
import { ProposedTestPlan } from '../framework/planning/test-case.types';
import { QaExecutionInput } from '../framework/reporting/report.types';
import { writeQaSummary } from '../framework/reporting/qa-summary';
import { evaluateTargetURL } from '../framework/safety/domain-policy';
import { verifyLocalFramework } from '../framework/verification/local-verification';

type Options = Record<string, string | boolean>;

function parseArguments(values: string[]): { command?: string; options: Options } {
  const [command, ...rest] = values;
  const options: Options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith('--')) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return { command, options };
}

function requiredOption(options: Options, name: string): string {
  const value = options[name];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing required option --${name}.`);
  return value.trim();
}

function stringOption(options: Options, name: string, fallback?: string): string | undefined {
  const value = options[name];
  return typeof value === 'string' ? value : fallback;
}

function commandRoot(options: Options): string {
  return path.resolve(stringOption(options, 'root', process.cwd())!);
}

function writePlan(project: string, root: string): { plan: ProposedTestPlan; jsonPath: string; markdownPath: string } {
  const config = loadProjectConfig(project, root);
  const plan = generateTestPlan(config);
  const outputDirectory = path.join(resolveProjectDirectory(project, root), 'artifacts/plans');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, 'test-plan.json');
  const markdownPath = path.join(outputDirectory, 'test-plan.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderTestPlanMarkdown(plan));
  return { plan, jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const { command, options } = parseArguments(process.argv.slice(2));
  const root = commandRoot(options);

  switch (command) {
    case 'onboard': {
      const projectSlug = requiredOption(options, 'project');
      const projectName = stringOption(options, 'name', projectSlug)!;
      const websiteType = stringOption(options, 'website-type', 'custom')!;
      if (!websiteTypes.includes(websiteType as WebsiteType)) {
        throw new Error(`--website-type must be one of: ${websiteTypes.join(', ')}.`);
      }
      const directory = createProjectScaffold({ root, projectSlug, projectName, websiteType: websiteType as WebsiteType });
      console.log(JSON.stringify({ status: 'created', project: projectSlug, directory }, null, 2));
      return;
    }

    case 'validate': {
      const project = requiredOption(options, 'project');
      const config = loadProjectConfig(project, root);
      const baseURL = resolveConfiguredBaseURL(config);
      const targetDecision = baseURL ? evaluateTargetURL(baseURL, config) : undefined;
      console.log(
        JSON.stringify(
          {
            status: 'valid',
            project: config.projectSlug,
            environment: config.testEnvironment,
            targetConfigured: Boolean(baseURL),
            targetAllowed: targetDecision?.allowed ?? false,
            targetReason: targetDecision?.reason ?? `Set ${config.baseUrlEnv ?? 'baseURL'} before discovery or execution.`,
            enabledProjects: config.browserProjects.filter((item) => item.enabled).map((item) => item.name)
          },
          null,
          2
        )
      );
      return;
    }

    case 'plan': {
      const project = requiredOption(options, 'project');
      const output = writePlan(project, root);
      console.log(JSON.stringify({ status: 'generated', tests: output.plan.tests.length, questions: output.plan.questions, jsonPath: output.jsonPath, markdownPath: output.markdownPath }, null, 2));
      return;
    }

    case 'approval-status': {
      const project = requiredOption(options, 'project');
      const config = loadProjectConfig(project, root);
      const planPath = stringOption(
        options,
        'plan',
        path.join(resolveProjectDirectory(project, root), 'artifacts/plans/test-plan.json')
      )!;
      const plan = JSON.parse(fs.readFileSync(path.resolve(planPath), 'utf8')) as ProposedTestPlan;
      const approvalPath = stringOption(options, 'approval');
      const manifest = approvalPath
        ? (JSON.parse(fs.readFileSync(path.resolve(approvalPath), 'utf8')) as ApprovalManifest)
        : undefined;
      const decisions = plan.tests.map((testCase) => evaluateApproval(testCase, config, manifest));
      console.log(JSON.stringify({ project, allowed: decisions.filter((item) => item.allowed).length, blocked: decisions.filter((item) => !item.allowed).length, decisions }, null, 2));
      return;
    }

    case 'report': {
      const project = requiredOption(options, 'project');
      const config = loadProjectConfig(project, root);
      const projectDirectory = resolveProjectDirectory(project, root);
      const resultsPath = path.resolve(
        stringOption(options, 'results', path.join(projectDirectory, 'test-data/sample-execution-results.json'))!
      );
      const input = JSON.parse(fs.readFileSync(resultsPath, 'utf8')) as QaExecutionInput;
      if (!input || !Array.isArray(input.results)) throw new Error('Execution results must contain a results array.');
      const outputDirectory = path.resolve(projectDirectory, config.reporting.outputDir);
      const output = writeQaSummary(input, outputDirectory);
      const excel = config.reporting.formats.includes('xlsx') && config.reporting.excel
        ? runExcelExporter({
            root,
            resultsPath,
            templatePath: path.resolve(root, config.reporting.excel.templatePath),
            outputPath: path.resolve(outputDirectory, config.reporting.excel.outputFile),
            baseURL: resolveConfiguredBaseURL(config),
            owner: config.reporting.excel.owner,
            sheetName: config.reporting.excel.sheetName
          })
        : undefined;
      console.log(JSON.stringify({ status: 'generated', ...output, excelPath: excel?.outputPath, excelRows: excel?.rowsWritten }, null, 2));
      return;
    }

    case 'verify-local': {
      console.log(JSON.stringify({ status: 'passed', ...verifyLocalFramework(root) }, null, 2));
      return;
    }

    default:
      throw new Error(
        'Usage: qa-agent <onboard|validate|plan|approval-status|report|verify-local> --project <slug> [options]'
      );
  }
}

function runExcelExporter(options: {
  root: string;
  resultsPath: string;
  templatePath: string;
  outputPath: string;
  baseURL?: string;
  owner?: string;
  sheetName?: string;
}): { outputPath: string; rowsWritten: number } {
  const exporter = path.resolve(options.root, 'framework/reporting/review-log-export.mjs');
  const args = [
    exporter,
    '--template', options.templatePath,
    '--results', options.resultsPath,
    '--output', options.outputPath,
    '--base-url', options.baseURL ?? '',
    '--owner', options.owner ?? 'QA Automation',
    '--sheet', options.sheetName ?? 'Review Log QA'
  ];
  const output = execFileSync(process.execPath, args, { cwd: options.root, encoding: 'utf8' });
  const lastLine = output.trim().split('\n').at(-1);
  if (!lastLine) throw new Error('Excel exporter did not return a result.');
  return JSON.parse(lastLine) as { outputPath: string; rowsWritten: number };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
