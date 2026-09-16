# Jam → developer workflow webhook

This standalone Vercel Function receives `jam.created` events from the Impremis
Jam workspace and forwards a normalized, idempotent fix request to a developer
automation endpoint such as n8n, a CI dispatcher, or a Claude Code runner.

It does not run Claude inside the public webhook request. The downstream runner
must own repository checkout, credentials, branch creation, tests, and pull-request
creation. It must also use the supplied `Idempotency-Key` to ignore duplicate
deliveries.

## 1. Configure the downstream developer runner

Create an HTTPS endpoint that accepts this request:

```json
{
  "event": "jam.ready_for_development",
  "deliveryId": "msg_...",
  "folderShortId": "gfxf",
  "jam": {
    "jamId": "...",
    "jamUrl": "https://jam.dev/c/..."
  },
  "instructions": "Use Jam MCP ..."
}
```

The request includes `Authorization: Bearer <DEVELOPER_TRIGGER_TOKEN>` and
`Idempotency-Key: <svix-id>`. Configure Claude Code in that runner with Jam MCP
and a workspace-scoped Jam PAT:

```bash
claude mcp add Jam https://mcp.jam.dev/mcp \
  -t http \
  -s user \
  --header "Authorization: Bearer $JAM_PAT"
```

The runner should reject a Jam unless Jam MCP confirms its folder short ID is
`gfxf`. This second check is required because `jam.created` does not include a
folder field.

## 2. Deploy the webhook receiver to Vercel

```bash
cd "Automation/QA Juls/integrations/jam-webhook"
vercel
```

Set every variable from `.env.example` in the Vercel project. Never commit the
real signing secret, Jam PAT, developer trigger token, or source-control token.
The resulting endpoint is:

```text
https://<your-vercel-project>.vercel.app/api/jam-created
```

## 3. Connect Jam

In the **Impremis** Jam workspace:

1. Open **Settings → Webhooks → Manage**.
2. Add the deployed `/api/jam-created` HTTPS endpoint.
3. Subscribe to `jam.created`.
4. Copy the `whsec_...` signing secret into `JAM_WEBHOOK_SECRET` in Vercel.
5. Replay a delivery from the Jam Webhook Portal or create a disposable test Jam.

## 4. Route QA evidence consistently

The QA reporter should use `JAM_FOLDER=gfxf`. The folder URL is:

```text
https://jam.dev/s/fae10464-b475-40db-b23b-a195b4d794f4/gfxf
```

## Security and operation

- The receiver validates `svix-id`, `svix-timestamp`, and `svix-signature` over
  the unmodified request body.
- Deliveries older than five minutes are rejected by default.
- Only workspace `fae10464-b475-40db-b23b-a195b4d794f4` is accepted.
- The downstream runner must deduplicate with `Idempotency-Key` and verify folder
  `gfxf` through Jam MCP before editing code.
- Claude may create a branch and PR, but should not merge without developer review.
- Send fix-verification Jams to a different folder if they should not trigger a
  second development run.

Run the local unit tests with:

```bash
npm test
```
