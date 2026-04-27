# createClient Function

Secure agency-only client and restaurant onboarding Function for Pixel One Visuals.

## Responsibilities

- Verify the authenticated caller from `x-appwrite-user-id`.
- Load the caller profile from `profiles`.
- Allow execution only when `profile.role === "agency_admin"` and the profile is active.
- Validate restaurant, owner, status, plan, and slug input server-side.
- Reject duplicate restaurant slugs.
- Reject already-used owner emails.
- Create the owner Auth user.
- Create the restaurant row.
- Create the owner profile row with `role=owner`.
- Create a default `site_settings` row.

The Function never returns or logs the temporary password.

## Runtime

- Node.js 20+
- Root directory: `functions/createClient`
- Entrypoint: `src/main.js`
- Build command: `npm install`

## Environment Variables

Set these in the Appwrite Function only:

```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
APPWRITE_PROFILES_TABLE_ID=profiles
APPWRITE_SITE_SETTINGS_TABLE_ID=site_settings
```

`APPWRITE_API_KEY` must never be placed in React, `.env.local`, or any `VITE_*` variable.

## Execute Access

Set execute access to authenticated `Users` only.

Do not allow `Guests` or `Any`.

## Test Payload

```json
{
  "restaurantName": "Pizza Rabat",
  "restaurantNameAr": "بيتزا الرباط",
  "slug": "pizza-rabat",
  "businessType": "restaurant",
  "ownerName": "Ahmed",
  "ownerEmail": "owner@example.com",
  "ownerPhone": "+212612345678",
  "temporaryPassword": "StrongPass123",
  "status": "draft",
  "plan": "starter",
  "notes": "optional internal note"
}
```

Expected response:

```json
{
  "ok": true,
  "restaurantId": "...",
  "ownerUserId": "...",
  "slug": "pizza-rabat",
  "warning": null
}
```

## Deployment

After adding or changing files under `functions/*`:

```bash
git add .
git commit -m "Add create client function"
git push origin main
```

Then create a new deployment or redeploy from the Appwrite Console.
