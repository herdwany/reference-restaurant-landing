# updateClientControls Appwrite Function

Server-side agency controls update with role verification and audit logging.

## Runtime

- Runtime: Node.js 20+
- Entrypoint: `src/main.js`
- Install command: `npm install`

## Environment Variables

Set these in the Appwrite Function settings only:

```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
APPWRITE_PROFILES_TABLE_ID=profiles
APPWRITE_AUDIT_LOGS_TABLE_ID=audit_logs
VIASOCKET_ORDER_WEBHOOK_URL=
```

Do not add `APPWRITE_API_KEY` to Vite or any frontend `.env` file.

## Request Headers

- `x-appwrite-user-id`: The caller's user ID (set by Appwrite)

## Request Body

```json
{
  "restaurantId": "restaurant-id",
  "plan": "pro",
  "status": "active",
  "billingStatus": "paid",
  "supportLevel": "standard",
  "subscriptionEndsAt": "2026-12-31T23:59:59.000Z",
  "trialEndsAt": null
}
```

The function verifies the caller is `agency_admin`, checks restaurant ownership in a team context, validates the input against a whitelist of allowed fields, and updates only safe fields.

## Response

```json
{
  "ok": true,
  "restaurantId": "...",
  "updatedFields": ["plan", "status"],
  "message": "Client controls updated successfully"
}
```

## Security

- Role verification: caller must be `agency_admin` and `active`
- Whitelist: only specific fields allowed
- Immutable: `ownerUserId`, `teamId`, `restaurantId` cannot be changed
- Audit: all changes logged to `audit_logs` table
- Errors: safe error messages returned, no sensitive data leaked
