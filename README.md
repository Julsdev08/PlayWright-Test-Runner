# Playwright Test Runner

Reusable Playwright QA runner with structured reporting, Jam failure evidence,
a Jam-to-developer webhook receiver, and a repository-scoped Codex QA workflow.

This repository intentionally contains only framework and integration code. It
does not include website-specific tests, selectors, scripts, credentials, or data.

## Contents

- `Automation/QA Juls/` — reusable runner, fixtures, reporters, and Jam integration
- `.agents/skills/jam-qa-triage/` — Codex workflow for Jam-driven QA triage
- `.codex/config.toml` — project-level Jam MCP endpoint without credentials

## Developer setup

```bash
cd "Automation/QA Juls"
npm ci
npx playwright install
cp .env.example .env
```

Configure an approved local or staging target in `.env`, then validate:

```bash
npm run typecheck
npm run qa:verify:local
npm run jam:webhook:test
```

See `Automation/QA Juls/README.md` for the runner, Jam publishing, webhook, and
project-extension workflow.

Local secrets, dependencies, generated reports, browser traces, videos, and
screenshots are ignored.
