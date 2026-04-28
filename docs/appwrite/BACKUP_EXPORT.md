# Backup / Export Client Data

Phase 9H adds a local, read-only export utility for one restaurant/client at a time.

The goal is to give the agency a safe operational backup path before production launch without adding a React UI, scheduled backups, restore/import, or cloud upload.

## Script

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

## Environment

The script reads `.env.setup` only, then falls back to `process.env` for local terminal usage.

Required values:

```text
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_BUCKET_ID=
```

Do not put `APPWRITE_API_KEY` in `.env.local`.

Do not create a `VITE_APPWRITE_API_KEY`.

The API key is used only by this local Node script and must never be bundled into React.

## Output

Exports are written under:

```text
exports/{slug-or-restaurantId}/{timestamp}/
```

Example:

```text
exports/demo-restaurant/2026-04-28T15-30-00/
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

Each JSON file is formatted with 2 spaces.

## Exported Tables

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

All tenant tables are scoped to one `restaurantId`. `profiles` are exported only when linked to the same `restaurantId`; the script does not export all users.

For `order_items`, the script first tries `restaurantId`. If a project schema stores order items only by `orderId`, it falls back to the exported orders and fetches matching items by `orderId`.

## Pagination

The script uses `Query.limit(100)` with `Query.offset(...)` and loops until all rows are fetched. A safety limit prevents infinite pagination loops.

## Privacy And Safety

- The script is read-only.
- It does not create rows.
- It does not update rows.
- It does not delete rows.
- It does not upload files.
- It does not download Storage assets in Phase 9H.
- It removes known secret-like fields such as passwords, API keys, tokens, and private keys from exported JSON.
- It does not print full exported row data in logs.

`exports/` may contain sensitive customer data and must not be committed to GitHub. The folder is ignored in `.gitignore`.

TODO: keep `audit_logs.metadata` sanitized at write time. The export preserves current stored values except known secret fields.

TODO: build a future `export:assets` command if Storage file downloads are needed.

## What This Does Not Do

- No restore/import.
- No scheduled backups.
- No upload to Google Drive, S3, or other cloud storage.
- No delete or cleanup action in Appwrite.
- No React UI.
- No agency dashboard button.
- No Function changes.
- No Appwrite schema changes.

---

# Import / Restore Foundation (FINALIZATION_BATCH_2)

## Script

A safe, read-only import script for validating and importing previously exported client data.

```bash
npm run import:client
```

Dry-run mode (default):

```bash
node scripts/importClientData.mjs
```

Apply mode (creates data):

```bash
node scripts/importClientData.mjs --apply
```

Specific export directory:

```bash
node scripts/importClientData.mjs exports/my-export/2026-04-28T15-30-00 --apply
```

## Features

- **Dry-run by default**: Shows what would be imported without writing anything
- **Safe validation**: Checks export structure and validates all restaurants before import
- **Duplicate protection**: Detects duplicate slugs in database before applying
- **No secrets**: Rejects exports containing API keys or secrets
- **No image uploads**: Images are not handled (use separate process)
- **Foundation only**: Actual import integration is not yet implemented

## Dry-Run Example Output

```
📋 Client Data Import Utility
═══════════════════════════════════════════════════════════
Mode: 🔍 DRY-RUN (no changes)
Export path: exports

📂 Using most recent export: 2026-04-28T15-39-31
📖 Reading export file: data.json
✅ Export structure valid
📅 Exported at: 2026-04-28T15:39:31.000Z
🍽️  Restaurants to import: 1

🔍 Validating restaurants...

📊 Import Summary:
  Valid restaurants: 1
  Invalid/skipped: 0

✅ Restaurants ready for import:
  • demo-restaurant (Demo Restaurant)
    - Team: team-123
    - Owner: user-456
    - Plan: starter

🔍 DRY-RUN: No changes made.

To apply this import, run:
  node scripts/importClientData.mjs exports --apply
```

## Apply Mode

When `--apply` is specified:

1. Validates export structure and restaurants
2. Checks for duplicate slugs in the database
3. Confirms all data is safe
4. **Currently outputs**: "Apply mode - data validated successfully"
5. **TODO**: Actual Appwrite import using `updateClientControlsViaFunction` for sensitive fields

### Important: Production Safety

- **Do NOT apply imports to production** without thorough testing in staging first
- Duplicate slug detection prevents accidental overwrites
- Sensitive fields (plan, billing status) are updated via Functions with role verification
- Import failures log warnings but can be retried

## Next Steps

- Integrate with Appwrite SDK in the script
- Use `updateClientControlsViaFunction` for plan/status updates
- Add `updateDomainSettingsViaFunction` for domain changes
- Handle profile and audit log restoration
- Test with production-like data in staging
- Do not apply to production without executive approval
