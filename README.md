# Impremis QA automation

Reusable Playwright website-testing framework with structured QA reporting, Jam
failure evidence, a Jam-to-developer webhook receiver, and a repository-scoped
Codex QA skill.

## Repository contents

- `Automation/QA Juls/` — tests, fixtures, page objects, reporters, and webhook integration
- `.agents/skills/jam-qa-triage/` — reusable Jam QA workflow for Codex
- `.codex/config.toml` — project-level Jam MCP endpoint (contains no credentials)

Local secrets, generated reports, recordings, browser traces, dependencies, and
unrelated automation projects are intentionally excluded.

## Developer setup

```bash
cd "Automation/QA Juls"
npm ci
npx playwright install
cp .env.example .env
```

Configure an approved staging target in `.env`:

```dotenv
TEST_ENV=staging
BASE_URL=https://approved-staging-host.example
JAM_FOLDER=gfxf
```

Then validate the installation:

```bash
npm run typecheck
npm run qa:verify:local
npm run jam:webhook:test
```

See `Automation/QA Juls/README.md` for test commands, environment safety rules,
Jam publishing, reporting, and framework extension guidance.
