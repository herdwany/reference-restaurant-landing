# Production Deployment

Phase 9I prepares the project for real staging/production deployment. It does not add product features, custom domain routing, subdomain routing, billing, payment, viaSocket, schema changes, or Function logic changes.

## Deployment Flow

1. Create an Appwrite production project, or use staging carefully for rehearsal only.
2. Copy `.env.setup.example` to `.env.setup` locally and point it to the target Appwrite project.
3. Run the schema/setup script against the target project:

```bash
npm run setup:appwrite
```

4. Deploy Appwrite Functions:
   - `createOrder`
   - `createReservation`
   - `createClient`
5. Configure Function environment variables in Appwrite Console.
6. Configure Function execute access.
7. Configure table permissions.
8. Configure Storage permissions.
9. Configure frontend Vite environment variables in the hosting provider.
10. Build the frontend:

```bash
npm run build
```

11. Deploy the frontend.
12. Run the post-deployment test checklist.
13. Run a local client export before large production migrations or manual data changes:

```bash
npm run export:client -- --slug demo-restaurant
```

## Appwrite Project

Recommended production setup:

- Use a dedicated Appwrite project for production.
- Keep staging and production data separate.
- Use production Function deployments.
- Keep permissions tighter than staging.
- Do not rely on direct browser database writes for orders, reservations, or client creation.

Staging can use a project such as `pixelone-staging` with test clients and test data.

## Functions

Deploy each Function from its own root folder:

| Function | Root | Entrypoint | Build | Execute Access |
| --- | --- | --- | --- | --- |
| `createOrder` | `functions/createOrder` | `src/main.js` | `npm install` | `Guests` or `Any` |
| `createReservation` | `functions/createReservation` | `src/main.js` | `npm install` | `Guests` or `Any` |
| `createClient` | `functions/createClient` | `src/main.js` | `npm install` | `Users` only |

`createClient` verifies `agency_admin` server-side through the authenticated caller and the `profiles` table. Do not allow `Guests` or `Any` to execute it.

Function environment variables must be configured in Appwrite Console only. Do not put `APPWRITE_API_KEY` in Vite env files or React code.

See `docs/appwrite/FUNCTIONS.md` for the full Function notes.

## Frontend Environment

Use `.env.production.example` as the production frontend template.

Required public Vite variables:

```text
VITE_APPWRITE_ENDPOINT
VITE_APPWRITE_PROJECT_ID
VITE_APPWRITE_DATABASE_ID
VITE_APPWRITE_BUCKET_ID
VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG
VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID
VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID
VITE_APPWRITE_CREATE_CLIENT_FUNCTION_ID
VITE_ENABLE_ANALYTICS
```

Forbidden in frontend env:

```text
APPWRITE_API_KEY
VITE_APPWRITE_API_KEY
```

## Production Safety Guards

The frontend already has production guards for sensitive public writes:

- Production builds block direct browser order creation when `VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID` is missing.
- Production builds block direct browser reservation creation when `VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID` is missing.
- `createClient` has no direct browser fallback.

In staging, old direct browser fallbacks may still exist for controlled testing. Production should use Functions and closed sensitive table permissions.

## Permissions

Use `docs/appwrite/PRODUCTION_SECURITY_CHECKLIST.md` as the source of truth.

High-level rules:

- Public visitors can read public site content only.
- Public visitors must not read orders, order items, reservations, profiles, or audit logs.
- Public visitors must not write to TablesDB directly after Functions are verified.
- `orders`, `order_items`, and `reservations` creation should happen through Functions only.
- Storage can expose public read for assets used on the public site.
- Storage must not allow public upload/update/delete.

## Frontend Deployment

Recommended first deployment path:

- Frontend: Vercel.
- Backend: Appwrite Cloud.
- Functions: Appwrite Functions.
- Storage: Appwrite Storage.

Appwrite Sites is also a valid option if the team wants to keep frontend hosting close to Appwrite.

See `docs/deployment/FRONTEND_HOSTING_OPTIONS.md`.

## Required Checks Before Launch

```bash
npm run build
npm audit --omit=dev
```

Then run `docs/deployment/POST_DEPLOYMENT_TESTS.md`.

## Not Included In Phase 9I

- No real subdomain resolver.
- No real custom domain resolver.
- No DNS automation.
- No billing or payment provider.
- No viaSocket integration.
- No schema migration.
- No Function logic changes.
