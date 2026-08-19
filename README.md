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
