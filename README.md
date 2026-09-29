# bun

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.16. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Site map coverage audit

The audit is read-only and requires an explicit scope:

```bash
bun run audit:site-maps -- --site-id site_123
bun run audit:site-maps -- --site-id site_123 --site-id site_456
bun run audit:site-maps -- --all-active
```

It reports the effective source for every attached location: selected GMB Place ID,
Places-autocomplete Place ID, coordinates, structured address, or no target.

Existing `location_state.gmb` selections saved without `metadata.placeId` cannot be
backfilled from stored data because the Place ID is Google-provided output-only data.
Refresh the account's GMB location list with valid OAuth credentials and reselect the
same location resource to persist its metadata. The audit intentionally performs no
writes or OAuth refreshes.

## Subscription billing

- Apply the matching monorepo migration, `20260928000000_saved_wallet_subscription_billing.sql`, before deploying these API and worker changes.
- Imported subscriptions retain their connected account, customer, saved payment method, exact billing anchor, and final price. Grouped bills use explicit billing items; child subscriptions never collect.
- Payment attempts are persisted on the invoice. A timeout is not a decline: reconcile a known Stripe intent before retrying, and hold an unknown outcome without an intent ID.
- Imported Stripe roots use exact-due renewals and retained explicit repair jobs; ordinary subscriptions keep the existing scheduler.
- Mobile payment-method/setup responses remain card/bank-only. Existing customer bindings are reused; ambiguous bindings return `409`. Access requires the member, a verified guardian relationship, or the internal service role.
- Customer migration and arming are a separate post-merge operation. This change adds no migration endpoint and performs no customer cutover.
- Subscription-linked electronic automatic invoice sends are rejected; use the existing subscription payment retry flow. Children and missing linked roots are rejected before any ordinary charge path.

Validate billing changes end to end with the local API, disposable PostgreSQL/Redis, a local payment-provider simulator, and the vendor UI. Exercise payer ownership, mobile customer reuse, duplicate attempts, unknown outcomes, and manual retry without production credentials or real charges.

