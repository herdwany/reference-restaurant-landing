# Deployment Checklist

Use this checklist before every production deployment.

## Build And Security

- [ ] Run `npm run build`.
- [ ] Run `npm audit --omit=dev`.
- [ ] Confirm no API keys are present in frontend code or `VITE_*` environment variables.
- [ ] Confirm no `APPWRITE_API_KEY` exists in `.env.local`.
- [ ] Confirm production direct database fallbacks are disabled for sensitive public writes.

## Appwrite Functions

- [ ] Deploy `createOrder`.
- [ ] Deploy `createReservation`.
- [ ] Deploy `createClient`.
- [ ] Test `createOrder` from `/r/:slug`.
- [ ] Test `createReservation` from `/r/:slug`.
- [ ] Test `createClient` from `/agency`.

## Permissions

- [ ] Sensitive table permissions are closed.
- [ ] Public read is enabled only for public restaurant content.
- [ ] Public read on Storage is limited to assets that must appear on the public site.
- [ ] No public read exists on customer orders, reservations, profiles, or agency-only data.
- [ ] No public update/delete exists on public content tables.

## Routing

- [ ] `/` works as demo/default.
- [ ] `/r/:slug` works for active restaurants.
- [ ] Missing `/r/:slug` shows a visitor-safe not found page.
- [ ] Draft public status is tested.
- [ ] Suspended public status is tested.
- [ ] Cancelled public status is tested.
- [ ] `/admin` works.
- [ ] `/admin/login` works.
- [ ] `/agency` works and redirects unauthenticated users to login.

## Roles And Tenant Scope

- [ ] `agency_admin` is tested.
- [ ] `owner` is tested.
- [ ] `staff` is tested.
- [ ] Agency selected restaurant context is tested.
- [ ] Owner/staff plan feature gating is tested.
- [ ] Agency override behavior is tested.

## Operations

- [ ] Backup/export plan exists, or a Phase 9H TODO is tracked before launch.
- [ ] Domain strategy is documented for the client.
- [ ] `/r/:slug` is communicated as the currently working public URL.
- [ ] Subdomain/custom domain timelines are not promised until resolver and DNS strategy are complete.
