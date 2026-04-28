# Production Security Checklist

Use this checklist after deploying `createOrder`, `createReservation`, `trackRequest`, and `createClient`.

## Functions

- [ ] `createOrder` Function is deployed from `functions/createOrder`.
- [ ] `createReservation` Function is deployed from `functions/createReservation`.
- [ ] `trackRequest` Function is deployed from `functions/trackRequest`.
- [ ] `createClient` Function is deployed from `functions/createClient`.
- [ ] `updateClientControls` Function is deployed from `functions/updateClientControls`.
- [ ] `updateDomainSettings` Function is deployed from `functions/updateDomainSettings`.
- [ ] `VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID` is set in production frontend env.
- [ ] `VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID` is set in production frontend env.
- [ ] `VITE_APPWRITE_TRACK_REQUEST_FUNCTION_ID` is set in production frontend env.
- [ ] `VITE_APPWRITE_CREATE_CLIENT_FUNCTION_ID` is set in production frontend env.
- [ ] `VITE_APPWRITE_UPDATE_CLIENT_CONTROLS_FUNCTION_ID` is set in production frontend env.
- [ ] `VITE_APPWRITE_UPDATE_DOMAIN_SETTINGS_FUNCTION_ID` is set in production frontend env.
- [ ] `createOrder` execute access is `Guests` or `Any`.
- [ ] `createReservation` execute access is `Guests` or `Any`.
- [ ] `trackRequest` execute access is `Guests` or `Any`.
- [ ] `createClient` execute access is `Users` only.
- [ ] `updateClientControls` execute access is `Users` only.
- [ ] `updateDomainSettings` execute access is `Users` only.
- [ ] `APPWRITE_API_KEY` exists only in Function environment variables.
- [ ] `.env.local`, `.env.production`, and Vite env variables do not contain `APPWRITE_API_KEY`.
- [ ] After changing files under `functions/*`, changes are committed, pushed to GitHub, then redeployed in Appwrite.

## Sensitive Public Writes

- [ ] Remove `Guests` / `Any` Create from `orders`.
- [ ] Remove `Guests` / `Any` Create from `order_items`.
- [ ] Remove `Guests` / `Any` Create from `reservations`.
- [ ] No public read on `orders`.
- [ ] No public read on `order_items`.
- [ ] No public read on `reservations`.
- [ ] No public read on `profiles`.
- [ ] No public read on `audit_logs`.
- [ ] Order checkout still works through `createOrder` after public create is removed.
- [ ] Booking still works through `createReservation` after public create is removed.
- [ ] `/r/:slug/track` works through `trackRequest` while public read remains disabled.

## Final Permissions Matrix

| Resource | Guests / Any | Users | Notes |
| --- | --- | --- | --- |
| `restaurants` | Read only | Read, Update if owner/staff admin needs settings writes | No public create/update/delete |
| `dishes` | Read only | Create, Read, Update, Delete temporarily | Tighten later with Teams/Functions |
| `offers` | Read only | Create, Read, Update, Delete temporarily | Tighten later with Teams/Functions |
| `gallery_items` | Read only | Create, Read, Update, Delete temporarily | No public writes |
| `faqs` | Read only | Create, Read, Update, Delete temporarily | No public writes |
| `site_settings` | Read only | Create, Read, Update | Delete disabled, or Users temporarily only if needed |
| `profiles` | No access | Read only | Create/update/delete later through agency/admin flow |
| `orders` | No access | Read, Update | Create only through Function, delete disabled |
| `order_items` | No access | Read only | Create only through Function |
| `reservations` | No access | Read, Update | Create only through Function, delete disabled |
| `audit_logs` | No access | Create, Read temporarily for current restaurant via app filter; Update/Delete disabled | MVP client-side logs only |
| `restaurant-assets` | Read only | Create, Read, Update, Delete temporarily | No public upload/update/delete |

## Manual Verification

- [ ] Send an order with `orderMode=database`; it appears in `/admin/orders`.
- [ ] Send an order with `orderMode=both`; it saves and WhatsApp opens.
- [ ] Send a reservation with `reservationMode=database`; it appears in `/admin/reservations`.
- [ ] Send a reservation with `reservationMode=both`; it saves and WhatsApp opens.
- [ ] Track an order by phone + `trackingCode`; verify the result is sanitized.
- [ ] Track a reservation by phone + `trackingCode`; verify deposit status is shown when applicable.
- [ ] Try the right tracking code with a wrong phone and confirm no result is returned.
- [ ] Temporarily remove a Function ID in production build and confirm direct DB write is not attempted.
- [ ] Dishes, offers, settings, FAQ, gallery, image uploads, cart, and WhatsApp still work.
- [ ] No horizontal scroll on public or admin mobile views.
- [ ] Audit logs appear in `/admin/activity` after admin create/update/delete/status changes.
- [ ] No payment gateway, billing provider, viaSocket, customer accounts, subdomain resolver, or custom domain resolver is enabled in this batch.

## audit_logs MVP Permissions

- Guests/Any: no permissions.
- Users: Create enabled temporarily.
- Users: Read enabled temporarily, with app-side `restaurantId` filtering for the current restaurant only.
- Users: Update/Delete disabled.

Security notes:

- Client-side audit logs are an MVP and are not tamper-proof.
- Later, sensitive operations such as order and reservation status changes should be audited server-side through Functions or an agency/team backend.
- Do not store personal customer data, full phone numbers, addresses, secrets, API keys, or full request payloads in `metadata`.
- Never expose logs across restaurants without a required `restaurantId` filter.

## Remaining Hardening

- [ ] Replace broad `Users` writes with Teams/Functions scoped to each restaurant.
- [ ] Add anti-spam/rate limiting to public Functions.
- [ ] Add throttling/rate limiting to `/track` and `trackRequest`.
- [ ] Recalculate all official order totals server-side from trusted menu/offer data.
- [ ] Move order/reservation status updates to Functions if stricter audit requirements are needed.
- [ ] Move audit logging for sensitive admin changes to server-side Functions or an agency/team backend.
