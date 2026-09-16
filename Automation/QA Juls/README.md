# AI-Powered QA Automation Framework

Playwright + TypeScript framework with fail-closed environment configuration, reusable fixtures, Page Objects, shared components, tagged representative tests, visual auditing, accessibility checks, and Playwright HTML reporting.

## Reusable QA Agent — Phase 3

The reusable onboarding layer is separate from the preserved signup examples.
It validates a project configuration, generates a read-only test plan, enforces
approval rules, and creates a concise QA summary without contacting a website.

Try the local configuration-only verification:

```bash
npm run qa:verify:local
```

No browser or web server is started by this command.

Create a future website project:

```bash
npm run qa:onboard -- --project client-site --name "Client Site" --website-type marketing
```

Then review `projects/client-site/project.config.json` and configure secrets in
an ignored `projects/client-site/.env` or the execution environment. Project
commands load that local `.env` without overriding values already supplied by CI.

Validate and generate the proposed read-only plan:

```bash
npm run qa:validate -- --project client-site
npm run qa:plan -- --project client-site
npm run qa:approval:status -- --project client-site
```

Generate a stakeholder summary from structured execution results:

```bash
npm run qa:report -- --project client-site --results /absolute/path/to/execution-results.json
```

Every normal Playwright command (`npm test`, `npm run test:smoke`, or `npx playwright test ...`) also writes the completed run to `reports/qa/Review Log QA.xlsx` using the preserved Review Log QA template. The workbook is replaced per run so it represents that command only; JSON source results are retained at `reports/qa/execution-results.json`.

Playwright statuses map to the existing spreadsheet values: passed becomes `Tested/QA Pass`, failed becomes `Open`, and skipped becomes `Awaiting spec`. Failed rows are marked for application-versus-automation triage instead of guessing the cause.

### Jam failure evidence

Jam publishing is opt-in and failure-only. The reporter waits for the final test
attempt, so a retry that passes does not create a Jam. Failed runs combine the
retained Playwright video and trace into a watchable Jam with console, network,
and user-action evidence.

Check the local CLI, then enable publishing for a run:

```bash
npm run jam:doctor
JAM_AUTO_CREATE=true npm test
```

Or use the convenience command:

```bash
npm run test:jam
```

Preview the generated Jam payloads without uploading anything:

```bash
npm run test:jam:dry-run
```

The reporter creates at most five Jams per run by default and writes receipts to
`reports/qa/jam-failures.json`. Change the cap with `JAM_MAX_FAILURE_JAMS` and
optionally route created Jams with `JAM_FOLDER`. Local runs use the authenticated
Jam CLI session; CI should provide a short-lived `JAM_TOKEN` secret. Never commit
Jam credentials or tokens.

For the Impremis workflow, `JAM_FOLDER=gfxf` routes reports to **QA TEST
PROCESS**. A deployable, signed `jam.created` receiver and setup instructions are
available in `integrations/jam-webhook/`. It forwards accepted events to a
separate developer or Claude Code runner; repository credentials and automatic
merge permissions do not belong in the QA test process.

When `xlsx` is enabled in `project.config.json`, the same report command also
writes every result into the preserved `Review Log QA` Excel format. Statuses
map to the existing dropdown values: passed → `Tested/QA Pass`, failed → `Open`,
and blocked/skipped → `Awaiting spec`.

Discovery and approved Playwright execution are intentionally not connected yet.
The current Phase 3 slice cannot browse a client site or submit a form.

## What It Includes

- Playwright test runner with TypeScript
- Config-driven pages and viewports
- Page Object Model foundation
- Pixelmatch visual comparison
- Responsive checks for overflow and clipped content
- Image validation for broken, blurry, scaled, and distorted images
- Functional smoke checks for links, buttons, forms, and common components
- Console and network monitoring
- Accessibility quick checks for alt text, labels, duplicate IDs, empty buttons, and empty links
- Performance warnings for load time, FCP, LCP, and CLS
- Excel report generation with one issue per row
- Terminal execution summary

## Folder Structure

```text
components/          Shared UI behavior used by more than one page or test
config/              Validated environment, route, viewport, and audit configuration
data/                Legacy scenario and test data; migration remains incremental
fixtures/            Safe target, page object, access gate, and unique account fixtures
pages/               Page-level navigation and user behavior
tests/smoke/         Small pull-request candidate coverage
tests/functional/    Focused validation behavior
tests/regression/    Critical and responsive representative coverage
tests/signup/        Existing signup suite, retained until incremental migration
utils/               Existing API, audit, reporting, and test-data helpers
reports/playwright/  Primary technical HTML report
visual/baselines/    Source-controlled visual reference screenshots
```

## Installation

```bash
npm ci
npx playwright install
```

## Configuration

Copy the environment template and fill in an approved target:

```bash
cp .env.example .env
```

Required settings:

```dotenv
TEST_ENV=staging
BASE_URL=https://your-approved-staging-host.example
```

`TEST_ENV` must be `local` or `staging` for browser execution. Production-like
targets are blocked. `STAGING_BASE_URL` remains a backward-compatible alias,
but `BASE_URL` takes precedence.

If an approved staging hostname does not contain a recognizable marker such as
`staging`, `qa`, `test`, or `dev`, it also requires the explicit
`ALLOW_UNRECOGNIZED_STAGING_HOST=true` acknowledgement.

Optional access-gate values must stay in `.env` or CI secrets:

```dotenv
QA_ACCESS_COOKIE_NAMES=access_cookie_name
QA_COOKIE_VALUE=secret-value
```

Do not commit `.env`, authentication state, access codes, tokens, or generated
reports. Tests fail before navigation when no safe target is configured.

### Representative configuration

`SIGNUP_PATH` defaults to `/signup`. `SIGNUP_API_PATTERN` defaults to
`**/*signup*` and should be set to the application's confirmed registration API
pattern before running the critical duplicate-submission test.

### Config-driven legacy audits

Edit `config/test.config.ts` to add pages:

```ts
export const pages = [
  {
    name: 'Home',
    path: '/',
    figmaReference: path.resolve('visual/baselines/home-desktop-1440.png'),
    criticalSelectors: ['header', 'main', 'footer'],
    smoke: {
      navLinks: ['header a', 'footer a'],
      buttons: ['button', 'a[role="button"]'],
      forms: ['form'],
      components: ['[role="tab"]', '[aria-expanded]', 'select']
    }
  }
];
```

Add or change viewports in the same file:

```ts
export const viewports = [
  { name: 'desktop-1440', width: 1440, height: 900, category: 'desktop' },
  { name: 'mobile-390', width: 390, height: 844, category: 'mobile' }
];
```

## Figma References

Export Figma frames as PNG files and place them in `visual/baselines/`.

The default naming pattern is:

```text
home-desktop-1440.png
home-desktop-1920.png
home-mobile-390.png
home-mobile-430.png
```

The framework captures the staging page and compares it with the matching reference using Pixelmatch. If a reference is missing, the run continues and records a low-severity warning in the Excel report.

## Run Tests

Run only the four migrated representative tests:

```bash
npm run test:representative
```

Run by tag:

```bash
npm run test:smoke
npm run test:regression
npm run test:critical
npm run test:desktop
npm run test:mobile
npm run test:accessibility
```

Tags currently used are `@smoke`, `@regression`, `@critical`, `@desktop`,
`@mobile`, and `@accessibility`. Desktop tests are excluded from the mobile
project and mobile tests are excluded from the desktop project.

Run the full legacy and migrated suite only after the target and scope are confirmed:

```bash
npm test
```

Headed mode:

```bash
npm run test:headed
```

Playwright UI:

```bash
npm run test:ui
```

Type check:

```bash
npm run typecheck
```

Signup flow only:

```bash
npm run test:signup
```

Future ecommerce flow backlog:

```bash
npm run test:ecommerce-backlog
```

The backlog command intentionally discovers skipped placeholders and is not a
measure of executable coverage.

## Ecommerce Flow Validation

The ecommerce coverage lives under `tests/signup` and `tests/ecommerce-flows`.
Signup is the first implemented flow. Login, forgot password, product listing,
product detail page, add to cart, checkout, payment errors, account dashboard,
and order history are scaffolded as skipped backlog scenarios until their
routes, selectors, and QA data are ready.

Safety defaults:

- The suite refuses to run against a URL that does not look like staging, QA,
  dev, test, or local.
- Account creation is skipped unless `ALLOW_SIGNUP_ACCOUNT_CREATION=true`.
- Email verification tests are skipped unless `ENABLE_TEST_INBOX=true`.
- Backend cleanup only runs when `ENABLE_TEST_ACCOUNT_CLEANUP=true` and
  `TEST_ACCOUNT_CLEANUP_ENDPOINT` is configured.
- Screenshots, videos, and traces remain failure-only through Playwright config.

Required ecommerce configuration is documented in `.env.example`.

## Reports

The Playwright HTML report under `reports/playwright/` is the primary technical
report. It links failures to the project/device and retained screenshots,
videos, or traces.

The legacy audit runner also writes an optional Excel report to:

```text
reports/excel/qa-report-<timestamp>.xlsx
```

Columns include:

- Test ID
- Page
- URL
- Area
- Component
- Viewport
- Browser
- Test Type
- Severity
- Status
- Issue Summary
- Actual Result
- Expected Result
- Steps to Reproduce
- Console Error
- Network Error
- Date Tested

Visual screenshots and diffs are written to:

```text
reports/visual/
```

## Terminal Summary

The run prints:

- Pages Tested
- Total Tests
- Passed
- Failed
- Visual Issues
- Functional Issues
- Responsive Issues
- Image Issues
- Accessibility Issues
- Performance Warnings
- Console Errors
- Network Errors
- Issues by Severity
- Execution Time

## CI/CD Example

```yaml
name: QA Automation

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
        env:
          STAGING_BASE_URL: ${{ secrets.STAGING_BASE_URL }}
      - uses: actions/upload-artifact@v4
        with:
          name: qa-reports
          path: reports/
```

## Extending The Framework

To add a page, add an object to `pages` in `config/test.config.ts`.

To add a viewport, add an object to `viewports`.

To add deeper component checks, create a utility in `utils/` and call it from `tests/qa-framework.spec.ts`.

To create page-specific workflows, add a class in `pages/` that extends `BasePage`, then use it in the test runner.

## Troubleshooting

**No test target is configured**

Set `TEST_ENV=local` with a localhost URL or `TEST_ENV=staging` with the approved
staging URL in `.env`. The framework intentionally has no public fallback URL.

**Production-like host is refused**

Do not bypass the guard. Confirm the approved non-production environment and
set `TEST_ENV` correctly.

**Access gate is visible**

Configure `QA_COOKIE_VALUE` and `QA_ACCESS_COOKIE_NAMES` through local or CI
secrets. The access gate must expose an accessible label such as “Access code”
or “Site password.”

**Critical signup test sends no request**

Confirm `SIGNUP_API_PATTERN`, required form fields, and the signup route with the
application team. Do not broaden the pattern until the real API contract is
known.

**A test passes alone but fails with the representative group**

Treat this as an isolation defect. Check shared backend data and cleanup; do not
add retries or execution ordering to conceal it.
