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
