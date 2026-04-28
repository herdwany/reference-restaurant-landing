# Backup / Export Client Data

Phase 9H adds a local, read-only export utility for one restaurant/client at a time.

The goal is to provide a safe operational backup path without adding a React UI, scheduled backups, restore/import writes, or cloud upload.

## Export Script

```bash
npm run export:client -- --slug demo-restaurant
```

or:

```bash
npm run export:client -- --restaurantId <rowId>
```

Direct Node usage is also supported:

```bash
node scripts/exportClientData.mjs --slug demo-restaurant
node scripts/exportClientData.mjs --restaurantId <rowId>
```

## Export Environment

The export script reads `.env.setup` first, then falls back to `process.env`.

Required values:

```text
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_BUCKET_ID=
```

Do not put `APPWRITE_API_KEY` in `.env.local`.
Do not create `VITE_APPWRITE_API_KEY`.

The API key is used only by local Node scripts and must never be bundled into React.

## Export Output

Exports are written under:

```text
exports/{slug-or-restaurantId}/{timestamp}/
```

Generated files:

```text
restaurant.json
site_settings.json
dishes.json
offers.json
faqs.json
gallery_items.json
orders.json
order_items.json
reservations.json
audit_logs.json
profiles.json
export-summary.json
```

## Export Safety

- The export script is read-only.
- It does not create rows.
- It does not update rows.
- It does not delete rows.
- It does not upload files.
- It does not download Storage assets in this phase.
- It removes known secret-like keys such as passwords, API keys, tokens, and private keys from exported JSON.
- It does not print full row payloads in logs.
- `exports/` must stay out of git and is already ignored.

## Export Coverage

The script exports these tables when they exist:

- `restaurants`
- `site_settings`
- `dishes`
- `offers`
- `faqs`
- `gallery_items`
- `orders`
- `order_items`
- `reservations`
- `audit_logs`
- `profiles`

All tenant tables are scoped to one `restaurantId`.

`order_items` export first tries `restaurantId`, then falls back to `orderId` if needed for schema compatibility.

## Pagination Safety

The export script uses `Query.limit(100)` with `Query.offset(...)` and stops when a page is short. A hard safety cap prevents infinite loops.

## Import / Restore Foundation

`scripts/importClientData.mjs` is **import dry-run foundation only**.

It can:

- locate a valid `export-summary.json`
- read and validate the summary structure
- print a safe summary of the export

It does not:

- create rows
- update rows
- delete rows
- restore Auth users
- restore Storage assets
- perform a full Appwrite restore

### Import Usage

Default dry-run:

```bash
npm run import:client
node scripts/importClientData.mjs
```

Specific export:

```bash
node scripts/importClientData.mjs exports/demo-restaurant/2026-04-28T15-30-00
```

Optional explicit apply request:

```bash
node scripts/importClientData.mjs exports/demo-restaurant/2026-04-28T15-30-00 --apply
```

`--apply` currently exits with a clear error because restore/write logic is intentionally not implemented.

### Import Safety Rules

- Dry-run is the default.
- No writes happen without future code changes.
- Do not describe the current script as a full restore tool.
- Do not use the current script as a production restore mechanism.
- Any future restore work must be designed and tested in staging first.

## What This Batch Does Not Add

- No full restore/import.
- No scheduled backups.
- No cloud upload.
- No React UI for backup/import.
- No payment gateway.
- No customer account login.
- No subdomain/custom domain resolver.
