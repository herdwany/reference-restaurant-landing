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
- [ ] Plan/status management works (via `updateClientControls` Function).
- [ ] Domain metadata management works (via `updateDomainSettings` Function).
- [ ] Updating plan, status, and billingStatus through Function succeeds.
- [ ] Updating domain type, subdomain, and domainStatus through Function succeeds.
- [ ] Audit logs show changes from `updateClientControls`.
- [ ] Audit logs show changes from `updateDomainSettings`.
- [ ] Preview opens `/r/{slug}`.
- [ ] Open client dashboard flow works.
- [ ] Unauthenticated `/agency` redirects to login.
- [ ] Run a local export for a test client:

```bash
npm run export:client -- --slug demo-restaurant
```

- [ ] Run a dry-run import test:

```bash
npm run import:client
```

- [ ] Import script shows valid restaurants without writing anything.

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
- [ ] `updateClientControls` executes for authenticated `agency_admin`.
- [ ] `updateClientControls` rejects owner/staff/non-agency users.
- [ ] `updateClientControls` rejects unauthenticated callers.
- [ ] `updateClientControls` updates only whitelisted fields.
- [ ] `updateDomainSettings` executes for authenticated `agency_admin`.
- [ ] `updateDomainSettings` rejects owner/staff/non-agency users.
- [ ] `updateDomainSettings` rejects unauthenticated callers.
- [ ] `updateDomainSettings` validates domain format.
- [ ] viaSocket webhooks (if configured) are called after order/reservation creation.

## Operations

- [ ] `npm run build` passes.
- [ ] `npm audit --omit=dev` has been reviewed.
- [ ] `node --check` passes for all Functions.
- [ ] A backup/export exists before major manual production changes.
- [ ] Domain promises to clients still match the current `/r/:slug` production capability.
- [ ] Feature flags `VITE_ENABLE_SUBDOMAIN_RESOLVER` and `VITE_ENABLE_CUSTOM_DOMAIN_RESOLVER` are `false` in production.
- [ ] Code splitting does not break routing (lazy-loaded admin/agency pages load correctly).
- [ ] No horizontal scroll on mobile.
