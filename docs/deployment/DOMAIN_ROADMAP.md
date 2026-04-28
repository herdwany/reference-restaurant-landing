# Domain Roadmap

Domain support should be delivered in controlled phases. Phase 9G does not enable real host-based routing.

## Phase A - Platform Path

Status: ready now.

```text
pixelonevisuals.tech/r/client-slug
```

- Uses the existing `/r/:slug` public resolver.
- Works with current order and reservation Functions.
- Remains the safe preview target from `/agency`.
- Does not require DNS work per client.

## Phase B - Platform Subdomain

Planned format:

```text
client.pixelonevisuals.tech
```

Required before activation:

- Hosting decision for wildcard subdomains.
- Wildcard DNS setup such as `*.pixelonevisuals.tech`.
- Host-based resolver that maps subdomain to restaurant.
- SSL behavior confirmed for wildcard domains.
- Unique subdomain enforcement.
- Clear fallback behavior when a subdomain is unknown or inactive.

## Phase C - Custom Domain

Planned format:

```text
www.clientdomain.ma
```

Required before activation:

- DNS instructions for the selected hosting provider.
- Domain verification flow.
- SSL provisioning behavior.
- Unique custom domain enforcement.
- Operational process for expired, failed, or changed domains.
- Support playbook for client DNS issues.

## Agency Metadata

The `/agency` dashboard already stores domain metadata:

- `domainType`
- `subdomain`
- `customDomain`
- `domainStatus`
- `domainNotes`
- `domainVerifiedAt`
- `dnsTarget`

This metadata prepares sales, onboarding, and support workflows. It does not make subdomains or custom domains route to the public site yet.

## Client Promise

Do not promise a client that a custom domain works before Phase C is implemented, verified, and deployed.

Until then, the working public link is `/r/:slug`, and the agency preview button should keep opening that URL.
