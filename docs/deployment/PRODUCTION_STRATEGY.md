# Production Strategy

Phase 9G documents the production hosting direction for Pixel One Visuals without enabling subdomain routing, custom domain routing, DNS automation, billing, or payments.

## Current State

- `/` remains the demo/default public restaurant URL and uses `VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG`.
- `/r/:slug` is the working public URL format for client restaurants.
- `/admin` is the client dashboard.
- `/agency` is the agency dashboard.
- `subdomain` and `customDomain` are stored as restaurant metadata only.
- Domain preview in `/agency` must keep opening `/r/:slug` until a real resolver is implemented.

## Recommended Hosting Architecture

- Frontend hosting: Vercel or Appwrite Sites.
- Backend platform: Appwrite Cloud.
- Functions: Appwrite Functions for `createClient`, `createOrder`, and `createReservation`.
- Storage: Appwrite Storage for public restaurant assets.
- Database: Appwrite TablesDB with strict tenant-aware permissions and Function-based writes for sensitive public flows.

## Domain Strategy

Current production-ready client link:

```text
pixelonevisuals.tech/r/client-slug
```

Next platform-owned domain phase:

```text
client.pixelonevisuals.tech
```

Advanced client-owned domain phase:

```text
www.clientdomain.ma
```

The current app should not inspect `window.location.host` to resolve restaurants yet. Host-based routing must wait until hosting, wildcard domain support, SSL behavior, DNS verification, and uniqueness rules are finalized.

## Admin And Agency URLs

The control surfaces should stay on a Pixel One-owned domain:

```text
pixelonevisuals.tech/admin
pixelonevisuals.tech/agency
```

A future app domain can be introduced later:

```text
app.pixelonevisuals.tech/admin
app.pixelonevisuals.tech/agency
```

Keeping dashboards on the platform domain simplifies authentication, security controls, support, and operational debugging.

## Public Site URLs

- Now: `/r/:slug`.
- Later: platform subdomains after a hosting and wildcard strategy is confirmed.
- Later: custom domains after DNS verification and SSL strategy are confirmed.

No customer should be promised working custom domain routing until the resolver, DNS instructions, verification flow, and SSL behavior are implemented and tested.
