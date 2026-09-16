---
name: jam-qa-triage
description: Use Jam recordings as evidence to reproduce reported website defects, create focused Playwright coverage in Automation/QA Juls, publish failure evidence through Jam CLI when requested, verify fixes, and summarize results. Trigger when a request includes a Jam link or asks to test, record, prove, or turn Jam feedback into QA coverage; do not use for unrelated Jam administration.
---

# Jam QA Triage

Use Jam MCP evidence to drive focused work in `Automation/QA Juls`.

## Prerequisite

Use the configured `jam` MCP server. If its tools are unavailable or authentication is required, tell the user exactly what is missing and do not infer recording details from the URL alone.

## Workflow

1. Start with Jam's details tool to establish the report, author, page, and available evidence.
2. Load only the evidence relevant to the request: user events and screenshots or video for reproduction steps; console logs and network requests for technical failures; transcript for spoken expectations; metadata for environment or feature-flag context.
3. Separate observed facts from hypotheses. Record the affected URL, viewport when available, exact reproduction steps, expected behavior, actual behavior, and supporting console or network evidence.
4. Inspect `Automation/QA Juls/README.md` and the closest existing fixtures, page objects, utilities, and specs before proposing changes. Reuse established patterns and add the smallest focused coverage that reproduces the reported behavior.
5. Do not edit generated `dist/`, `reports/`, `test-results/`, or Playwright HTML output. Do not copy Jam credentials, personal data, tokens, or unnecessary recording content into source files or reports.
6. Before browser execution, validate the configured project and safety/approval state with the framework's existing commands. Never weaken its local/staging target restrictions or approval gates.
7. Prefer a narrow Playwright command for the affected spec or tag. Run broader regression coverage only when the change can plausibly affect adjacent behavior or the user requests it.
8. Classify the result as reproduced, not reproduced, fixed, still failing, blocked by environment, or insufficient evidence. Include the command run, relevant artifacts, and any mismatch between the Jam environment and the test target.

## Planning and execution

For analysis-only requests, stop after an evidence-backed test plan unless the user also asks to modify or run the framework.

For implementation requests:

- Add or update TypeScript source under `Automation/QA Juls`; let the normal build regenerate JavaScript when needed.
- Prefer existing tags such as `@smoke`, `@regression`, `@critical`, `@desktop`, `@mobile`, and `@accessibility` when they accurately describe the scenario.
- Use deterministic assertions based on the reported behavior. Avoid tests that merely assert copied Jam wording or depend on transient recording timestamps.
- Keep credentials and target-specific secrets in the framework's ignored environment configuration.

## Creating Jam evidence

Jam MCP reads and updates existing Jams; Jam CLI creates recordings and publishes Playwright artifacts. When the user asks to record, show, prove, or create a Jam for defects found during testing:

- Confirm `jam auth status` succeeds locally, or use `JAM_TOKEN` from CI secret storage.
- Use `JAM_AUTO_CREATE=true` for the relevant Playwright command. The framework publishes only the final failed attempt, combines its retained video and trace, caps uploads with `JAM_MAX_FAILURE_JAMS`, and writes receipts to `reports/qa/jam-failures.json`.
- Use `JAM_AUTO_CREATE=true JAM_AUTO_CREATE_DRY_RUN=true` when validating payload construction without creating external Jams.
- Do not enable automated publishing unless the user's request authorizes creating Jam reports. Do not upload recordings that contain secrets or unnecessary personal data.
- Treat an uploaded failure as evidence, not automatic proof of an application defect. Classify application defects versus automation or environment failures in the final report.

## Suggested prompts

- `Use this Jam to reproduce the bug and add a focused regression test: <Jam URL>`
- `Analyze this Jam and produce a test plan only: <Jam URL>`
- `Verify whether the fix for this Jam now passes on the approved staging target: <Jam URL>`
- `Test this feature; if a reproducible defect is found, create a Jam with failure evidence and return the link.`
