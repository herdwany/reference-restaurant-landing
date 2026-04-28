# Appwrite Functions

## Production Deployment Summary

Use these settings when deploying production Functions:

| Function | Root directory | Entrypoint | Build command | Execute access |
| --- | --- | --- | --- | --- |
| `createOrder` | `functions/createOrder` | `src/main.js` | `npm install` | `Guests` or `Any` |
| `createReservation` | `functions/createReservation` | `src/main.js` | `npm install` | `Guests` or `Any` |
| `trackRequest` | `functions/trackRequest` | `src/main.js` | `npm install` | `Guests` or `Any` |
| `createClient` | `functions/createClient` | `src/main.js` | `npm install` | `Users` only |

`createOrder`, `createReservation`, and `trackRequest` are public visitor entrypoints and must be paired with closed table permissions for `orders`, `order_items`, and `reservations`.

`createClient` is an authenticated agency operation. It verifies `agency_admin` server-side through `profiles`; never allow `Guests` or `Any` to execute it.

Keep `APPWRITE_API_KEY` only in Function environment variables. Frontend Vite env should contain only public Function IDs.

## Phase 8A: createOrder

The public checkout should use the `createOrder` Function in production instead of writing directly to `orders` and `order_items` from the browser.

Function source:

`functions/createOrder`

Runtime:

- Node.js 20+
- Entrypoint: `src/main.js`
- Install command: `npm install`

## Function Environment Variables

Set these in the Appwrite Console for the Function only:

```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_ORDERS_TABLE_ID=orders
APPWRITE_ORDER_ITEMS_TABLE_ID=order_items
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
APPWRITE_DISHES_TABLE_ID=dishes
```

Do not put `APPWRITE_API_KEY` in `.env.local`, `.env.example`, Vite variables, or React code.

## Console Setup

1. Open Appwrite Console.
2. Create a new Function named `createOrder`.
3. Select Node.js 20 or newer.
4. Upload or connect the `functions/createOrder` folder.
5. Set the entrypoint to `src/main.js`.
6. Add the environment variables listed above.
7. Allow execution from public visitors only for this Function endpoint, not for database reads.
8. Deploy the Function.
9. Copy the Function ID.
10. Add the ID to frontend `.env.local`:

```env
VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID=
```

No secrets belong in this Vite variable. It is only the public Function ID.

## Test Payload

```json
{
  "restaurantSlug": "demo-restaurant",
  "customerName": "اسم العميل",
  "customerPhone": "0612345678",
  "customerAddress": "العنوان",
  "notes": "ملاحظات",
  "source": "website",
  "items": [
    {
      "dishId": "dish-id",
      "dishName": "برجر",
      "quantity": 2,
      "unitPrice": 45
    }
  ]
}
```

Expected response:

```json
{
  "ok": true,
  "orderId": "...",
  "trackingCode": "PO-8F3K2A",
  "totalAmount": 90,
  "itemCount": 1,
  "status": "new",
  "source": "website"
}
```

## Fallback Behavior

- If `VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID` is empty, the frontend keeps using the old browser `createOrder` path for staging.
- If the Function fails and `orderMode=both`, the cart is preserved and WhatsApp opens as a fallback.
- If `orderMode=database`, the frontend shows an error and does not auto-open WhatsApp.
- If `orderMode=whatsapp`, the Function is not called.
- In production builds, direct browser writes to `orders` / `order_items` are blocked when the Function ID is missing.

## Permissions After Verification

After the Function is deployed and tested:

`orders`

- Remove public create.
- Keep read/update for authenticated users only.
- Keep delete disabled or temporary for authenticated admin testing only.

`order_items`

- Remove public create.
- Keep read for authenticated users only.
- Update/delete are usually not needed.

Never enable public read for orders or order items.

## Phase 8B: createReservation

The public booking form should use the `createReservation` Function in production instead of writing directly to `reservations` from the browser.

Function source:

`functions/createReservation`

Runtime:

- Node.js 20+ or the same Node.js runtime used by `createOrder`
- Root directory when connected to GitHub: `functions/createReservation`
- Entrypoint: `src/main.js`
- Build command: `npm install`

## createReservation Environment Variables

Set these in the Appwrite Console for the Function only:

```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_RESERVATIONS_TABLE_ID=reservations
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
APPWRITE_SITE_SETTINGS_TABLE_ID=site_settings
```

Do not put `APPWRITE_API_KEY` in `.env.local`, `.env.example`, Vite variables, or React code.

## createReservation Console Setup

1. Open Appwrite Console.
2. Create a new Function named `createReservation`.
3. Select Node.js 20 or newer, or Node.js 25 if that is what `createOrder` uses.
4. Connect the GitHub repository and set root directory to `functions/createReservation`.
5. Set the entrypoint to `src/main.js`.
6. Set build command to `npm install`.
7. Add the environment variables listed above.
8. Set Execute access to `Any` or `Guests`.
9. Deploy the Function.
10. Copy the Function ID.
11. Add the ID to frontend `.env.local`:

```env
VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID=
```

No secrets belong in this Vite variable. It is only the public Function ID.

After changing or adding files under `functions/*`, publish the files before redeploying:

```bash
git add .
git commit -m "Add create reservation function"
git push origin main
```

Then create a new deployment or redeploy from Appwrite Console.

## createReservation Test Payload

```json
{
  "restaurantSlug": "demo-restaurant",
  "customerName": "اسم العميل",
  "customerPhone": "0612345678",
  "reservationDate": "2026-04-27",
  "reservationTime": "20:00",
  "peopleCount": 4,
  "notes": "ملاحظات اختيارية",
  "source": "website"
}
```

Expected response:

```json
{
  "ok": true,
  "reservationId": "...",
  "trackingCode": "RS-7A2K9B",
  "reservationDate": "2026-04-27",
  "reservationTime": "20:00",
  "peopleCount": 4,
  "status": "pending_confirmation",
  "depositStatus": "none",
  "depositAmount": null,
  "source": "website"
}
```

`createReservation` reads `site_settings` when available. It sets `pending_confirmation` for manual confirmation, or `deposit_required` plus `depositStatus=required` when the large-group deposit rules apply. No payment gateway is used; deposit tracking is manual only.

## createReservation Fallback Behavior

- If `VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID` is empty, the frontend keeps using the old browser `createReservation` path for staging.
- If the Function fails and `reservationMode=both`, the form data is preserved and WhatsApp opens as a fallback.
- If `reservationMode=database`, the frontend shows an error and does not auto-open WhatsApp.
- If `reservationMode=whatsapp`, the Function is not called.
- In production builds, direct browser writes to `reservations` are blocked when the Function ID is missing.

## createReservation Permissions After Verification

After the Function is deployed and tested:

`reservations`

- Remove public create.
- Keep read/update for authenticated users only.
- Keep delete disabled or temporary for authenticated admin testing only.

Never enable public read for reservations.

## Phase 8C: Production Guard

Production builds require Function IDs for database-backed public order and reservation flows:

```env
VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID=
VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID=
VITE_APPWRITE_TRACK_REQUEST_FUNCTION_ID=
```

If either ID is missing in production:

- `orderMode=database` shows an error and does not write directly to `orders`.
- `orderMode=both` falls back to WhatsApp and does not write directly to `orders`.
- `reservationMode=database` shows an error and does not write directly to `reservations`.
- `reservationMode=both` falls back to WhatsApp and does not write directly to `reservations`.

The old direct Client SDK create path remains only for development/staging testing.

See `docs/appwrite/PRODUCTION_SECURITY_CHECKLIST.md` before removing public create permissions.

## FINALIZATION_BATCH_1: trackRequest

The public tracking page `/r/:slug/track` uses `trackRequest` so customers can track an order or reservation without creating an account and without public reads on sensitive tables.

Function source:

`functions/trackRequest`

Runtime:

- Node.js 20+
- Root directory: `functions/trackRequest`
- Entrypoint: `src/main.js`
- Build command: `npm install`
- Execute access: `Guests` or `Any`

Environment variables:

```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
APPWRITE_ORDERS_TABLE_ID=orders
APPWRITE_ORDER_ITEMS_TABLE_ID=order_items
APPWRITE_RESERVATIONS_TABLE_ID=reservations
```

Frontend public variable:

```env
VITE_APPWRITE_TRACK_REQUEST_FUNCTION_ID=
```

Payload:

```json
{
  "restaurantSlug": "demo-restaurant",
  "phone": "0612345678",
  "trackingCode": "PO-8F3K2A",
  "type": "order"
}
```

`type` is optional. The Function resolves the active restaurant by slug, searches only inside that restaurant, compares normalized phone numbers, and returns a sanitized result. It does not return addresses, private notes, cross-restaurant data, or raw table rows.

Security notes:

- Keep public read disabled on `orders`, `order_items`, and `reservations`.
- Keep `APPWRITE_API_KEY` only in Function env.
- Add rate limiting or anti-spam controls before high-traffic production use.

## Phase 9C: createClient

The agency dashboard uses the `createClient` Function to create a new restaurant/client without exposing server credentials in React.

Function source:

`functions/createClient`

Runtime:

- Node.js 20+ or the same Node.js runtime used by the other Functions
- Root directory when connected to GitHub: `functions/createClient`
- Entrypoint: `src/main.js`
- Build command: `npm install`

## createClient Environment Variables

Set these in the Appwrite Console for the Function only:

```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
APPWRITE_PROFILES_TABLE_ID=profiles
APPWRITE_SITE_SETTINGS_TABLE_ID=site_settings
```

Do not put `APPWRITE_API_KEY` in `.env.local`, `.env.example`, Vite variables, or React code.

## createClient Security

- Execute access: `Users` only.
- Do not allow `Guests`.
- Do not allow `Any`.
- The Function reads the authenticated caller from `x-appwrite-user-id`.
- The Function loads the caller profile from `profiles`.
- The Function allows the operation only when `profile.role === "agency_admin"` and the profile is active.
- The frontend never sends or controls the new owner role. The Function always creates `role=owner`.
- Temporary passwords are never returned in the response and must not be logged.

Required API key scopes for the Function key:

- `users.read`
- `users.write`
- `rows.read`
- `rows.write`
- plus any table read/write scopes Appwrite requires for your project setup

## createClient Console Setup

1. Open Appwrite Console.
2. Create a new Function named `createClient`.
3. Select Node.js 20 or newer.
4. Connect the GitHub repository and set root directory to `functions/createClient`.
5. Set the entrypoint to `src/main.js`.
6. Set build command to `npm install`.
7. Add the environment variables listed above.
8. Set Execute access to `Users` only.
9. Deploy the Function.
10. Copy the Function ID.
11. Add the ID to frontend `.env.local`:

```env
VITE_APPWRITE_CREATE_CLIENT_FUNCTION_ID=
```

No secrets belong in this Vite variable. It is only the public Function ID.

After changing or adding files under `functions/*`, publish the files before redeploying:

```bash
git add .
git commit -m "Add create client function"
git push origin main
```

Then create a new deployment or redeploy from Appwrite Console.

## createClient Test Payload

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
  "notes": "optional"
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

## createClient Error Cases

- Duplicate slug returns `409` with `هذا الرابط مستخدم بالفعل.`
- Existing owner email returns `409` with `هذا البريد مستخدم بالفعل.`
- Missing or non-agency caller returns `403`.
- Invalid input returns `400`.
- If default settings creation fails after the user/restaurant/profile are created, the response includes a `warning` and the client may need manual repair.

## createClient Frontend Behavior

- If `VITE_APPWRITE_CREATE_CLIENT_FUNCTION_ID` is missing, `/agency` shows `إعداد إنشاء العملاء غير مفعّل بعد. أضف Function ID.`
- There is no direct browser fallback for Auth user, profile, or restaurant creation.
- No public signup is added.
