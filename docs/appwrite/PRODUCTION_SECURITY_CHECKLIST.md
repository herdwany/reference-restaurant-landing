# Production Security Checklist

Use this checklist after deploying `createOrder` and `createReservation`.

## Functions

- [ ] `createOrder` Function is deployed from `functions/createOrder`.
- [ ] `createReservation` Function is deployed from `functions/createReservation`.
- [ ] `VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID` is set in production frontend env.
- [ ] `VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID` is set in production frontend env.
- [ ] Function execute access is `Guests` or `Any`.
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
- [ ] Order checkout still works through `createOrder` after public create is removed.
- [ ] Booking still works through `createReservation` after public create is removed.

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
| `audit_logs` | No access | No access, or future manager read only | Future agency/admin hardening |
| `restaurant-assets` | Read only | Create, Read, Update, Delete temporarily | No public upload/update/delete |

## Manual Verification

- [ ] Send an order with `orderMode=database`; it appears in `/admin/orders`.
- [ ] Send an order with `orderMode=both`; it saves and WhatsApp opens.
- [ ] Send a reservation with `reservationMode=database`; it appears in `/admin/reservations`.
- [ ] Send a reservation with `reservationMode=both`; it saves and WhatsApp opens.
- [ ] Temporarily remove a Function ID in production build and confirm direct DB write is not attempted.
- [ ] Dishes, offers, settings, FAQ, gallery, image uploads, cart, and WhatsApp still work.
- [ ] No horizontal scroll on public or admin mobile views.

## Remaining Hardening

- [ ] Replace broad `Users` writes with Teams/Functions scoped to each restaurant.
- [ ] Add anti-spam/rate limiting to public Functions.
- [ ] Recalculate all official order totals server-side from trusted menu/offer data.
- [ ] Add server-side audit logs after agency/admin permissions are designed.
