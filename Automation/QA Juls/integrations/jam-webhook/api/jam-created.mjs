import { createHmac, timingSafeEqual } from 'node:crypto';

const REQUIRED_JAM_FIELDS = ['jamId', 'jamUrl', 'teamId', 'type', 'createdAt', 'author', 'media', 'systemInfo'];

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  }

  const configuration = readConfiguration();
  if (configuration.error) return json({ error: configuration.error }, 503);

  const rawBody = await request.text();
  const deliveryId = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');

  const verification = verifyJamSignature({
    rawBody,
    deliveryId,
    timestamp,
    signature,
    secret: configuration.webhookSecret,
    toleranceSeconds: configuration.toleranceSeconds
  });
  if (!verification.ok) return json({ error: verification.error }, 400);

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON payload.' }, 400);
  }

  const validationError = validateJamCreated(event);
  if (validationError) return json({ error: validationError }, 400);

  if (event.teamId !== configuration.teamId) {
    return json({ accepted: false, reason: 'Jam belongs to a different workspace.' }, 200);
  }

  const instructions = [
    `Use Jam MCP to inspect ${event.jamUrl}.`,
    `Before changing code, confirm the Jam belongs to folder short ID ${configuration.folderShortId}.`,
    'If it is outside that folder, stop without starting development work.',
    'If it is inside that folder, reproduce the issue in the configured repository, identify the root cause, implement the smallest safe fix, and run focused regression coverage.',
    'Prepare a branch and pull request for developer review; do not merge automatically.',
    'Comment on the Jam with the pull-request link, tests run, and verification result.'
  ].join(' ');

  const response = await fetch(configuration.triggerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${configuration.triggerToken}`,
      'Idempotency-Key': deliveryId
    },
    body: JSON.stringify({
      event: 'jam.ready_for_development',
      deliveryId,
      folderShortId: configuration.folderShortId,
      jam: event,
      instructions
    })
  });

  if (!response.ok) {
    return json(
      { error: 'Developer workflow rejected the event.', downstreamStatus: response.status },
      502
    );
  }

  return json({ accepted: true, deliveryId, jamId: event.jamId }, 200);
}

export function verifyJamSignature({
  rawBody,
  deliveryId,
  timestamp,
  signature,
  secret,
  toleranceSeconds,
  nowSeconds = Math.floor(Date.now() / 1000)
}) {
  if (!deliveryId || !timestamp || !signature) {
    return { ok: false, error: 'Missing Standard Webhooks signature headers.' };
  }

  const signedAt = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(signedAt) || Math.abs(nowSeconds - signedAt) > toleranceSeconds) {
    return { ok: false, error: 'Webhook timestamp is outside the accepted tolerance.' };
  }

  let key;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  } catch {
    return { ok: false, error: 'Webhook signing secret is invalid.' };
  }

  const expected = createHmac('sha256', key)
    .update(`${deliveryId}.${timestamp}.${rawBody}`)
    .digest();
  const candidates = signature
    .split(' ')
    .filter((item) => item.startsWith('v1,'))
    .map((item) => Buffer.from(item.slice(3), 'base64'));
  const valid = candidates.some(
    (candidate) => candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );

  return valid
    ? { ok: true }
    : { ok: false, error: 'Webhook signature verification failed.' };
}

function readConfiguration() {
  const webhookSecret = process.env.JAM_WEBHOOK_SECRET?.trim();
  const teamId = process.env.JAM_TEAM_ID?.trim();
  const folderShortId = process.env.JAM_FOLDER_SHORT_ID?.trim();
  const triggerUrl = process.env.DEVELOPER_TRIGGER_URL?.trim();
  const triggerToken = process.env.DEVELOPER_TRIGGER_TOKEN?.trim();
  const toleranceSeconds = positiveInteger(process.env.WEBHOOK_TOLERANCE_SECONDS, 300);

  if (!webhookSecret || !teamId || !folderShortId || !triggerUrl || !triggerToken) {
    return { error: 'Webhook integration is missing required environment configuration.' };
  }

  try {
    const parsed = new URL(triggerUrl);
    if (parsed.protocol !== 'https:') throw new Error('not HTTPS');
  } catch {
    return { error: 'DEVELOPER_TRIGGER_URL must be a valid HTTPS URL.' };
  }

  return { webhookSecret, teamId, folderShortId, triggerUrl, triggerToken, toleranceSeconds };
}

function validateJamCreated(event) {
  if (!event || typeof event !== 'object') return 'Webhook body must be an object.';
  const missing = REQUIRED_JAM_FIELDS.filter((field) => event[field] === undefined);
  if (missing.length > 0) return `Missing required Jam fields: ${missing.join(', ')}.`;
  if (typeof event.jamId !== 'string' || typeof event.jamUrl !== 'string' || typeof event.teamId !== 'string') {
    return 'Jam identifiers must be strings.';
  }
  return undefined;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}
