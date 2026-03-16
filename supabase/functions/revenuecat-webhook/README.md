# RevenueCat Webhook (Supabase Edge Function)

This function processes RevenueCat webhook events and applies `plan_tier` changes through the secure DB RPC:

- RPC: `public.apply_billing_plan_tier`
- Migration prerequisite: `supabase/migrations/00011_billing_webhook_and_plan_tier_guard.sql`

## Required secrets

Set these in Supabase project secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REVENUECAT_PRO_ENTITLEMENT_ID` (default: `pro`)

At least one webhook auth mode is required:

1. `REVENUECAT_WEBHOOK_AUTH_TOKEN` (recommended static bearer token)
2. `REVENUECAT_WEBHOOK_HMAC_SECRET` (optional HMAC signature verification)

If both are set, both checks are enforced.

## Deploy

```bash
supabase functions deploy revenuecat-webhook
```

## RevenueCat webhook settings

- URL: `https://<your-project-ref>.supabase.co/functions/v1/revenuecat-webhook`
- Auth header (recommended):
  - Header: `Authorization`
  - Value: `Bearer <REVENUECAT_WEBHOOK_AUTH_TOKEN>`
- If you also use HMAC mode, configure RevenueCat to send signature header and set `REVENUECAT_WEBHOOK_HMAC_SECRET`.

## Event mapping

The function updates to:

- `pro` on: `INITIAL_PURCHASE`, `NON_RENEWING_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION`, `SUBSCRIPTION_EXTENDED`, `TEMPORARY_ENTITLEMENT_GRANT`
- `free` on: `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `SUBSCRIPTION_PAUSED`

Only events affecting the configured entitlement ID are applied.

## Notes

- `app_user_id` should be a Supabase user UUID. The app currently sets RevenueCat `appUserID` to Supabase `user.id`.
- Unknown/unmapped events return `202` and are intentionally ignored.
- Idempotency is handled by `p_event_id` in the RPC (duplicate events become no-ops).
