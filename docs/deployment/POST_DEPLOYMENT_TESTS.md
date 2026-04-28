# Post Deployment Tests

Run this checklist after deploying staging or production.

## Public Site

- [ ] Open `/`.
- [ ] Open `/r/demo-restaurant`.
- [ ] Open `/r/client-slug`.
- [ ] Open `/r/not-existing` and confirm the visitor-safe not found page.
- [ ] Set a test restaurant to `draft` and confirm the public status message.
- [ ] Set a test restaurant to `suspended` and confirm the public status message.
- [ ] Set a test restaurant to `cancelled` and confirm the public status message.
- [ ] Set the restaurant back to `active` and confirm the public site renders.
- [ ] Send an order from `/r/:slug`.
- [ ] Confirm the order appears for the same restaurant in `/admin/orders`.
- [ ] Send a reservation from `/r/:slug`.
- [ ] Confirm the reservation appears for the same restaurant in `/admin/reservations`.
- [ ] Check mobile and desktop layouts for horizontal scroll.

## Admin

- [ ] Owner login works.
- [ ] Staff login works if staff accounts exist.
- [ ] `/admin/dishes` loads for the active restaurant.
- [ ] `/admin/orders` loads and is scoped to the active restaurant.
- [ ] `/admin/reservations` loads and is scoped to the active restaurant.
- [ ] `/admin/settings` respects the current plan.
- [ ] Starter plan feature gating is tested.
- [ ] Pro plan feature gating is tested.
- [ ] Disabled features show upgrade messaging for owner/staff.
- [ ] `agency_admin` override behavior is tested only through the intended agency workflow.

## Agency

- [ ] `agency_admin` login works.
- [ ] `/agency` loads.
- [ ] Creating a client through `createClient` works.
- [ ] Plan/status management works.
- [ ] Domain metadata management works.
- [ ] Preview opens `/r/{slug}`.
- [ ] Open client dashboard flow works.
- [ ] Unauthenticated `/agency` redirects to login.
- [ ] Run a local export for a test client:

```bash
npm run export:client -- --slug demo-restaurant
```

## Security

- [ ] `APPWRITE_API_KEY` is not present in frontend code.
- [ ] `VITE_APPWRITE_API_KEY` does not exist.
- [ ] `APPWRITE_API_KEY` exists only in Function environment variables or local `.env.setup`.
- [ ] No public read on `orders`.
- [ ] No public read on `order_items`.
- [ ] No public read on `reservations`.
- [ ] No public read on `profiles`.
- [ ] No public read on `audit_logs`.
- [ ] No `Guests` or `Any` Create on `orders` after `createOrder` is verified.
- [ ] No `Guests` or `Any` Create on `order_items` after `createOrder` is verified.
- [ ] No `Guests` or `Any` Create on `reservations` after `createReservation` is verified.
- [ ] Storage public read is limited to public assets.
- [ ] Storage has no public upload/update/delete.
- [ ] Audit logs are not publicly readable.

## Function Smoke Tests

- [ ] `createOrder` executes as a public visitor.
- [ ] `createReservation` executes as a public visitor.
- [ ] `createClient` executes for authenticated `agency_admin`.
- [ ] `createClient` rejects owner/staff/non-agency users.
- [ ] `createClient` rejects unauthenticated callers.

## Operations

- [ ] `npm run build` passes.
- [ ] `npm audit --omit=dev` has been reviewed.
- [ ] A backup/export exists before major manual production changes.
- [ ] Domain promises to clients still match the current `/r/:slug` production capability.
