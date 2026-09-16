import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import handler, { verifyJamSignature } from '../api/jam-created.mjs';

const secret = `whsec_${Buffer.from('test-secret').toString('base64')}`;
const nowSeconds = 1_800_000_000;
const deliveryId = 'msg_test_delivery';
const payload = JSON.stringify({
  jamId: 'jam-id',
  jamUrl: 'https://jam.dev/c/jam-id',
  teamId: 'impremis-team',
  type: 'video',
  createdAt: '2026-09-15T00:00:00.000Z',
  author: { email: 'qa@example.com' },
  media: {},
  systemInfo: {}
});

function signature(body = payload, timestamp = String(nowSeconds)) {
  const digest = createHmac('sha256', Buffer.from('test-secret'))
    .update(`${deliveryId}.${timestamp}.${body}`)
    .digest('base64');
  return `v1,${digest}`;
}

test('accepts a valid Standard Webhooks signature', () => {
  assert.deepEqual(
    verifyJamSignature({
      rawBody: payload,
      deliveryId,
      timestamp: String(nowSeconds),
      signature: signature(),
      secret,
      toleranceSeconds: 300,
      nowSeconds
    }),
    { ok: true }
  );
});

test('rejects modified payloads and stale deliveries', () => {
  assert.equal(
    verifyJamSignature({
      rawBody: `${payload} `,
      deliveryId,
      timestamp: String(nowSeconds),
      signature: signature(),
      secret,
      toleranceSeconds: 300,
      nowSeconds
    }).ok,
    false
  );
  assert.equal(
    verifyJamSignature({
      rawBody: payload,
      deliveryId,
      timestamp: String(nowSeconds - 301),
      signature: signature(payload, String(nowSeconds - 301)),
      secret,
      toleranceSeconds: 300,
      nowSeconds
    }).ok,
    false
  );
});

test('forwards an Impremis Jam with an idempotency key and folder guard', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.JAM_WEBHOOK_SECRET = secret;
  process.env.JAM_TEAM_ID = 'impremis-team';
  process.env.JAM_FOLDER_SHORT_ID = 'gfxf';
  process.env.DEVELOPER_TRIGGER_URL = 'https://automation.example/jam-fix';
  process.env.DEVELOPER_TRIGGER_TOKEN = 'test-token';
  process.env.WEBHOOK_TOLERANCE_SECONDS = '300';

  let forwarded;
  globalThis.fetch = async (url, options) => {
    forwarded = { url, options };
    return new Response(null, { status: 202 });
  };

  try {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const request = new Request('https://webhook.example/api/jam-created', {
      method: 'POST',
      headers: {
        'svix-id': deliveryId,
        'svix-timestamp': timestamp,
        'svix-signature': signature(payload, timestamp)
      },
      body: payload
    });
    const response = await handler(request);
    assert.equal(response.status, 200);
    assert.equal(forwarded.url, 'https://automation.example/jam-fix');
    assert.equal(forwarded.options.headers['Idempotency-Key'], deliveryId);
    const body = JSON.parse(forwarded.options.body);
    assert.equal(body.folderShortId, 'gfxf');
    assert.match(body.instructions, /confirm the Jam belongs to folder short ID gfxf/);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});
