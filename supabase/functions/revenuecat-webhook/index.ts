import { createClient } from 'npm:@supabase/supabase-js@2';

type RevenueCatEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[];
};

type RevenueCatWebhookPayload = {
  api_version?: string;
  event?: RevenueCatEvent;
};

const GRANTING_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

const REVOKING_EVENT_TYPES = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'SUBSCRIPTION_PAUSED',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str);
}

async function computeHmacSha256(rawBody: string, secret: string): Promise<ArrayBuffer> {
  const keyData = new TextEncoder().encode(secret);
  const messageData = new TextEncoder().encode(rawBody);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, messageData);
}

function pickUserId(event: RevenueCatEvent): string | null {
  const candidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
  ];
  for (const candidate of candidates) {
    if (candidate && UUID_RE.test(candidate)) return candidate;
  }
  return null;
}

function resolveTargetTier(event: RevenueCatEvent, proEntitlementId: string): 'pro' | 'free' | null {
  const type = event.type ?? '';
  const entitlementIds = event.entitlement_ids ?? [];
  const affectsProEntitlement = entitlementIds.includes(proEntitlementId);

  if (!affectsProEntitlement) return null;
  if (GRANTING_EVENT_TYPES.has(type)) return 'pro';
  if (REVOKING_EVENT_TYPES.has(type)) return 'free';
  return null;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authToken = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN');
  const hmacSecret = Deno.env.get('REVENUECAT_WEBHOOK_HMAC_SECRET');
  const proEntitlementId = Deno.env.get('REVENUECAT_PRO_ENTITLEMENT_ID') ?? 'pro';

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'missing_supabase_env' });
  }

  if (!authToken && !hmacSecret) {
    return jsonResponse(500, {
      error: 'missing_webhook_auth_configuration',
      detail: 'Set REVENUECAT_WEBHOOK_AUTH_TOKEN and/or REVENUECAT_WEBHOOK_HMAC_SECRET.',
    });
  }

  const authorizationHeader = request.headers.get('authorization') ?? '';
  if (authToken) {
    const expected = `Bearer ${authToken}`;
    if (authorizationHeader !== expected) {
      return jsonResponse(401, { error: 'invalid_authorization' });
    }
  }

  const rawBody = await request.text();

  if (hmacSecret) {
    const signatureHeader =
      request.headers.get('x-revenuecat-signature') ??
      request.headers.get('x-signature') ??
      '';

    if (!signatureHeader) {
      return jsonResponse(401, { error: 'missing_signature' });
    }

    const computed = await computeHmacSha256(rawBody, hmacSecret);
    const computedHex = toHex(computed);
    const computedBase64 = toBase64(computed);
    const provided = signatureHeader.trim();
    const normalized = provided.replace(/^sha256=/i, '');

    if (provided !== computedHex && normalized !== computedHex && provided !== computedBase64 && normalized !== computedBase64) {
      return jsonResponse(401, { error: 'invalid_signature' });
    }
  }

  let payload: RevenueCatWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RevenueCatWebhookPayload;
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }

  const event = payload.event;
  if (!event?.type) {
    return jsonResponse(400, { error: 'missing_event_type' });
  }

  const userId = pickUserId(event);
  if (!userId) {
    return jsonResponse(202, {
      ok: true,
      ignored: true,
      reason: 'no_uuid_app_user_id',
      eventType: event.type,
    });
  }

  const targetTier = resolveTargetTier(event, proEntitlementId);
  if (!targetTier) {
    return jsonResponse(202, {
      ok: true,
      ignored: true,
      reason: 'event_not_mapped_to_tier_change',
      eventType: event.type,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.rpc('apply_billing_plan_tier', {
    p_user_id: userId,
    p_plan_tier: targetTier,
    p_event_id: event.id ?? null,
    p_provider: 'revenuecat',
    p_event_type: event.type,
    p_payload: payload,
  });

  if (error) {
    return jsonResponse(500, {
      error: 'apply_billing_plan_tier_failed',
      detail: error.message,
    });
  }

  return jsonResponse(200, {
    ok: true,
    userId,
    targetTier,
    eventType: event.type,
    eventId: event.id ?? null,
  });
});
