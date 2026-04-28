# Environments

Pixel One Visuals should separate staging and production behavior before onboarding real clients.

## Staging

Staging is for experiments, internal demos, and client setup tests.

- Can use a project name such as `pixelone-staging`.
- Uses test restaurants, test orders, test reservations, and test agency accounts.
- Can keep controlled development fallbacks where needed.
- Should use deployed staging Functions before testing production-like flows.
- Must not contain real customer operational data unless the customer has approved a staging workflow.

## Production

Production is for real clients and live restaurant traffic.

- A separate Appwrite project is recommended.
- Uses production Appwrite Functions.
- Uses strict permissions for sensitive tables.
- Should not rely on direct browser database fallbacks for orders, reservations, client creation, or other sensitive writes.
- Public read should be limited to public restaurant content and public assets.
- Agency actions that affect tenants should move progressively behind Appwrite Functions or server-side rules.

## Frontend Environment Variables

The React/Vite frontend can use only public configuration values:

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

Do not put `APPWRITE_API_KEY` in `.env.local`.

Do not create any `VITE_APPWRITE_API_KEY` variable.

API keys belong only in Appwrite Function environment variables or a secure server runtime, never in the React bundle.

## Environment Promotion

Before promoting staging to production:

- Deploy the matching Functions to the target Appwrite project.
- Confirm table and bucket IDs for the target project.
- Confirm `VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG` points to the intended demo/default restaurant.
- Confirm `/r/:slug`, `/admin`, and `/agency` work against the target project.
- Confirm draft, suspended, cancelled, and active public status behavior.
