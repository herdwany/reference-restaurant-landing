# Final Acceptance Checklist

## Public

- [ ] Open `/`.
- [ ] Open `/r/demo-restaurant`.
- [ ] Open `/r/not-existing`.
- [ ] Open `/r/demo-restaurant/track`.
- [ ] Verify `ar`, `fr`, and `en` switch correctly.
- [ ] Verify Arabic uses RTL and French/English use LTR.
- [ ] Verify no obvious horizontal scroll on mobile.
- [ ] Submit an order flow end to end.
- [ ] Submit a reservation flow end to end.
- [ ] Verify tracking works with phone + tracking code.
- [ ] Verify `deposit_required` appears when reservation settings require it.
- [ ] Verify CTA buttons still work.
- [ ] Verify WhatsApp links still work.
- [ ] Verify the public site does not show "template/customizable" placeholder wording.

## Admin

- [ ] Login as `owner`.
- [ ] Login as `staff`.
- [ ] Open `/admin/settings`.
- [ ] Open `/admin/dishes`.
- [ ] Open `/admin/offers`.
- [ ] Open `/admin/gallery`.
- [ ] Open `/admin/orders`.
- [ ] Open `/admin/reservations`.
- [ ] Open `/admin/activity`.
- [ ] Verify feature gating blocks plan-restricted saves for non-agency roles.
- [ ] Verify owner/staff scope stays tied to their own `restaurantId`.

## Agency

- [ ] Login as `agency_admin`.
- [ ] Open `/agency`.
- [ ] Create a client through `createClient`.
- [ ] Change plan/status/billing/support through `updateClientControls`.
- [ ] Change domain metadata through `updateDomainSettings`.
- [ ] Open the selected client dashboard from `/agency`.
- [ ] Preview the client public site.
- [ ] Verify owner/staff are blocked from `/agency`.
- [ ] Verify `selectedRestaurantId` affects only `agency_admin`, not owner/staff.

## Security

- [ ] Confirm no API keys exist in frontend source or Vite public env.
- [ ] Confirm `orders`, `order_items`, and `reservations` do not require public read.
- [ ] Confirm `trackRequest` works through Function execution, not public table reads.
- [ ] Confirm `createOrder`, `createReservation`, `trackRequest`, `createClient`, `updateClientControls`, and `updateDomainSettings` are deployed.
- [ ] Confirm `updateClientControls` and `updateDomainSettings` execute access is `Users` only.
- [ ] Confirm `audit_logs` is not public.
- [ ] Confirm Storage public read is limited to intended public assets only.
- [ ] Confirm tracking responses do not expose address, private notes, or full phone numbers.

## Backup

- [ ] Run `npm run export:client -- --slug demo-restaurant`.
- [ ] Confirm export writes under `exports/`.
- [ ] Run `npm run import:client`.
- [ ] Confirm import works as dry-run validation only.
- [ ] Confirm no `exports/` files are committed to git.

## Deployment

- [ ] Confirm production frontend env includes all required Function IDs.
- [ ] Confirm staging and production envs are separated.
- [ ] Confirm production does not rely on direct sensitive table fallback.
- [ ] Run post-deployment smoke tests for `/`, `/r/:slug`, `/r/:slug/track`, `/admin`, and `/agency`.
