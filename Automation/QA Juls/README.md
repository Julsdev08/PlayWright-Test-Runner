# Playwright QA runner with Jam integration

This directory contains the reusable test runner and reporting integrations. It
does not include tests, credentials, selectors, data, or scripts for a specific
client website.

## Included

- Playwright and TypeScript configuration
- local/staging safety checks
- reusable page, access-gate, and QA fixtures
- functional, responsive, accessibility, performance, image, console, network,
  and optional visual-comparison checks
- structured JSON, terminal, HTML, and Excel reporting
- automatic Jam creation for retained Playwright failure evidence
- a signed Jam webhook receiver for downstream developer automation
- project onboarding, planning, approval, reporting, and local verification CLI

## Install

```bash
npm ci
npx playwright install
cp .env.example .env
```

Configure an approved target in `.env`:

```dotenv
TEST_ENV=staging
BASE_URL=https://your-approved-staging-host.example
ALLOW_UNRECOGNIZED_STAGING_HOST=false
```

Production-like targets are blocked. An unrecognized staging hostname requires
an explicit `ALLOW_UNRECOGNIZED_STAGING_HOST=true` acknowledgement.

## Run the generic QA audit

The generic audit uses the pages and selectors in `config/test.config.ts`.
Update that configuration for the target project without adding client-specific
coverage to the shared runner repository.

```bash
npm test
npm run test:headed
npm run test:ui
npm run test:desktop
npm run test:mobile
npm run test:accessibility
```

## Watch iPhone and Samsung browser tests

The runner includes iPhone 15 (WebKit), Galaxy S24 (Chromium), and the existing
Pixel 5 (Chromium) as separate Playwright projects. They are included in
`npm test`; use `npm run test:mobile` to run just the mobile projects. The
generic QA audit keeps each phone's configured viewport and reports the device
project name with its actual viewport size.

Install the project dependencies and the two browser engines used by the new
phone profiles:

```bash
npm ci
npx playwright install chromium webkit
```

Set an approved local or staging target in `.env` as described above, then open
visible browser windows while the tests run:

```bash
npm run test:iphone-15:watch
npm run test:galaxy-s24:watch
npm run test:devices:watch
```

These commands use `--headed --workers=1`, so the browser window is visible
and the two phone projects run one at a time. The window closes after the test.
To pause and step through a test with Playwright Inspector, use
`npm run test:iphone-15:debug` or `npm run test:galaxy-s24:debug`.
Add a test file path after `--`
to watch only that test, for example:

```bash
npm run test:iphone-15:watch -- tests/qa-framework.spec.ts
```

Playwright's device profiles emulate the phone's browser viewport, user agent,
touch input, and related settings in a **desktop browser window**. They do not
open an iOS Simulator, Android Emulator, or physical phone. For a native Android
device or Android Virtual Device, Playwright has a separate experimental Android
API that requires Android SDK/ADB and Chrome on the device; it is not wired into
these `playwright test` projects. Native iOS Simulator testing likewise needs a
separate mobile automation setup. The headed commands above require no mobile
SDK or simulator installation.

Useful validation commands:

```bash
npm run typecheck
npm run qa:verify:local
npm run jam:webhook:test
```

## Project workflow CLI

```bash
npm run qa:onboard -- --project my-project --base-url https://staging.example.com
npm run qa:validate -- --project my-project
npm run qa:plan -- --project my-project
npm run qa:approval:status -- --project my-project
npm run qa:report -- --project my-project
```

Generated project configuration and reports must not contain credentials.
Environment-specific values belong in ignored `.env` files or CI secrets.

## Jam failure reporting

Check local Jam CLI access:

```bash
npm run jam:doctor
npm run jam:auth:status
```

Publish only the final failed attempt from each test:

```bash
JAM_AUTO_CREATE=true npm test
```

Validate the Jam payload without creating an external report:

```bash
JAM_AUTO_CREATE=true JAM_AUTO_CREATE_DRY_RUN=true npm test
```

Relevant environment variables:

```dotenv
JAM_AUTO_CREATE=false
JAM_AUTO_CREATE_DRY_RUN=false
JAM_MAX_FAILURE_JAMS=5
JAM_FOLDER=gfxf
JAM_CLI_PATH=
```

The reporter combines retained failure video and trace evidence, limits uploads,
and stores receipts in `reports/qa/jam-failures.json`. A Jam is evidence for
triage; it is not automatically proof that the application is defective.

For visible iPhone 15 and Galaxy S24 runs with automatic Jam evidence on a final
failure, use:

```bash
npm run jam:doctor
npm run jam:auth:status
npm run test:devices:jam:dry-run
npm run test:devices:jam
```

The dry run writes the proposed Jam payload without uploading it. To run only
one phone, use `npm run test:iphone-15:jam` or
`npm run test:galaxy-s24:jam`. Jam titles and descriptions name the Playwright
device project. The failure screenshot is used as the Jam poster image; video
and trace are included when Playwright retains them. No Jam is created while a
test is still running or after a retry that passes.

## Jam webhook integration

The standalone receiver is in `integrations/jam-webhook`. It verifies signed
`jam.created` requests and forwards an idempotent, normalized task to a developer
runner such as n8n, CI, or Claude Code.

```bash
npm run jam:webhook:test
```

Deployment and secret configuration are documented in
`integrations/jam-webhook/README.md`.

## Repository layout

```text
cli/                       Project workflow CLI
components/                Reusable access-gate helper
config/                    Target, page, viewport, and budget configuration
fixtures/                  Generic Playwright QA fixtures
framework/                 Approval, planning, reporting, safety, verification
integrations/jam-webhook/  Signed Jam webhook receiver
pages/                     Generic page objects
scripts/                   Jam CLI and report-tool adapters
tests/                     Framework-level generic audit
utils/                     Reusable QA checks and reports
visual/baselines/          Optional approved visual reference images
```

## Adding a project

Keep product-specific tests in the product repository or a separate project
package. Reuse the runner's fixtures and reporters, but do not commit production
credentials, personal data, recorded sessions, generated reports, traces, or
videos.
