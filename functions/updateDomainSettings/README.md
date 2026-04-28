# updateDomainSettings Appwrite Function

Server-side domain settings update with role verification and audit logging.

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
```

Do not add `APPWRITE_API_KEY` to Vite or any frontend `.env` file.

## Request Headers

- `x-appwrite-user-id`: The caller's user ID (set by Appwrite)

## Request Body

```json
{
  "restaurantId": "restaurant-id",
  "domainType": "subdomain",
  "subdomain": "my-restaurant",
  "customDomain": "restaurant.example.com",
  "dnsTarget": "pixelonevisuals.tech",
  "domainStatus": "pending",
  "domainVerifiedAt": "2026-04-28T15:00:00.000Z",
  "domainNotes": "Domain awaiting verification"
}
```

The function verifies the caller is `agency_admin`, validates domain settings against a whitelist, and updates only allowed fields.

## Response

```json
{
  "ok": true,
  "restaurantId": "...",
  "updatedFields": ["domainType", "subdomain"],
  "message": "Domain settings updated successfully"
}
```

## Security

- Role verification: caller must be `agency_admin` and `active`
- Whitelist: only domain-related fields allowed
- Immutable: `ownerUserId`, `teamId`, `restaurantId` cannot be changed
- Audit: all changes logged to `audit_logs` table
- Errors: safe error messages returned, no sensitive data leaked
