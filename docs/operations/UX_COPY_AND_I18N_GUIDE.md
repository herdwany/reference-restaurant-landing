# UX Copy and Static i18n Guide

## System Labels vs Customer Content

System labels are owned by the product and must use `t("key")` from `src/lib/i18n/uiDictionary.ts`. Examples include buttons, filters, status labels, errors, empty states, modal copy, table labels, and admin/agency navigation.

Customer content is owned by the restaurant and must not be translated automatically. Examples include restaurant names, dish names, offer titles, FAQ text, gallery titles, custom hero copy, and testimonials. Use existing translation fields and `getLocalizedField` only when the customer has provided translations.

## Adding a New Key

1. Add the same key to `ar`, `fr`, and `en` in `uiDictionary.ts`.
2. Keep the key name stable and product-oriented, for example `orderArchivedSuccess`.
3. Use `t("orderArchivedSuccess")` in components instead of inline text.
4. Run `npm run build` so TypeScript catches missing keys.

## Friendly Error Rules

Use practical messages that tell the manager what happened and what to do next.

Bad:

```text
Appwrite Function not configured
restaurantId missing
permission denied
direct sensitive table fallback disabled
```

Good:

```text
This service is not enabled yet. Please contact support.
Could not identify the current restaurant. Sign in again or contact support.
You do not have access.
This operation cannot run from the browser in production.
```

Prefer `mapKnownErrorToFriendlyMessage(error, t)` from `src/lib/friendlyErrors.ts` when showing errors in admin, agency, public booking, cart, or tracking flows. Technical details may stay in `console.warn` during development.

## Testing ar/fr/en

Check the public site, `/admin/login`, `/admin/orders`, `/admin/reservations`, `/admin/settings`, `/agency`, and `/r/:slug/track`.

Verify:

- `ar` uses RTL and Arabic labels.
- `fr` and `en` use LTR and do not show Arabic static labels.
- Restaurant-authored content stays as authored unless a translation field exists.
- Success, error, empty, and feature-gating messages are practical and non-technical.
- No horizontal scroll appears when switching direction.

## Admin and Agency Rule

Do not add new hardcoded static labels inside `/admin` or `/agency`. Add a dictionary key first, then call `t("key")`.
