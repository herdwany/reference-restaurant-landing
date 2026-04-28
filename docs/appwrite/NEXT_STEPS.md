# Next Steps

## Phase 2 - Completed

- `/admin/login` لتسجيل الدخول عبر Appwrite Auth.
- قراءة session الحالية من Appwrite Account.
- Admin layout أولي مع Sidebar وTopbar وOverview.
- حماية `/admin` قبل عرض لوحة التحكم.

## Phase 2.5 - Completed

- تحميل `profile` من جدول `profiles` بعد تسجيل الدخول.
- تحديد الدور: `agency_admin` أو `owner` أو `staff`.
- تحميل `restaurantId` وبيانات المطعم للمالك والموظف.
- منع دخول الحسابات غير المرتبطة أو غير المفعلة.
- دعم مبدئي لـ`agency_admin` بدون بناء `/agency` بعد.

## Phase 2.6 - Completed

- `scripts/setupAppwrite.mjs` ينشئ قاعدة البيانات والجداول والأعمدة والفهارس.
- إنشاء demo restaurant.
- اختبار تسجيل دخول Appwrite الحقيقي.
- Admin Overview يعرض اسم المطعم من Appwrite.

## Phase 3 - Completed

- Admin CMS reusable components:
  - `AdminPageHeader`
  - `AdminCard`
  - `AdminEmptyState`
  - `AdminLoadingState`
  - `AdminErrorState`
  - `AdminStatusBadge`
  - `AdminConfirmDialog`
  - `AdminFormModal`
  - `AdminActionButton`
- `/admin/dishes` لإدارة الأطباق والمنيو فقط.
- الأطباق scoped دائمًا عبر `restaurantId` القادم من `AuthContext` و`useActiveRestaurantScope`.
- إضافة وتعديل طبق.
- إخفاء وإظهار طبق عبر `isAvailable`.
- حذف نهائي متاح كإجراء ثانوي مع confirm واضح.
- `imageUrl` اليدوي بقي مدعومًا، وتمت إضافة upload لاحقًا في Phase 7A للأطباق والعروض فقط.
- لا يوجد Offers Manager بعد.
- لا يوجد Orders Manager بعد.
- لا يوجد Reservations Manager بعد.
- لا يوجد Settings Manager بعد.
- لا يوجد Agency Dashboard بعد.

## Phase 3.5 - Completed

- Public site reads available dishes from Appwrite.
- Fallback to `restaurantConfig.ts` when Appwrite is not configured, fails, restaurant is missing, or dishes are empty.
- Hidden dishes with `isAvailable=false` do not appear publicly.
- All public dishes queries stay scoped by `restaurantId`.
- Public offers binding added in Phase 4.5.
- No orders/reservations yet.
- Uploaded dish images from Phase 7A are compatible with public rendering through `imageUrl`.

## Phase 4 - Completed

- `/admin/offers` لإدارة عروض المطعم.
- Offers scoped by `restaurantId`.
- Add/Edit/Activate/Deactivate/Delete offer.
- `imageUrl` اليدوي بقي مدعومًا، وتمت إضافة upload لاحقًا في Phase 7A للأطباق والعروض فقط.
- لا يوجد Orders/Reservations بعد.
- لا يوجد Agency Dashboard بعد.

## Phase 4.5 - Completed

- Public site reads active offers from Appwrite.
- Fallback to `restaurantConfig.ts` when Appwrite is not configured, fails, restaurant is missing, or offers are empty.
- Inactive offers with `isActive=false` do not appear publicly.
- No orders/reservations yet.
- Uploaded offer images from Phase 7A are compatible with public rendering through `imageUrl`.
- No agency dashboard yet.

## Phase 5 - Completed

- `/admin/settings` لإدارة بيانات التواصل وإعدادات الموقع.
- `/admin/faqs` لإدارة الأسئلة الشائعة.
- Contact and site settings scoped by `restaurantId`.
- FAQ scoped by `restaurantId`.
- Public site reads settings and FAQ from Appwrite with fallback to `restaurantConfig.ts`.
- No orders/reservations yet.
- No image upload inside settings yet.
- No agency dashboard yet.

## Phase 6A - Completed

- Public checkout can create `orders` and `order_items` in Appwrite TablesDB.
- Checkout uses `restaurantId` from the restaurant loaded by slug, not from a public form field.
- `orderMode` supports `whatsapp`, `database`, and `both`.
- WhatsApp checkout fallback remains available if Appwrite create fails.
- `/admin/orders` displays orders scoped by the active restaurant only.
- Owners and staff manage orders for their own restaurant through `useActiveRestaurantScope`.
- `agency_admin` without a selected restaurant sees the agency-scope warning instead of all orders.
- Order status can be changed to `new`, `confirmed`, `preparing`, `ready`, `delivered`, or `cancelled`.
- Order details show customer data and item rows without adding reservations.
- No Reservations Manager, Image Upload, Agency Dashboard, Appwrite Functions, or viaSocket integration was added.

### Phase 6A Appwrite permissions for staging

For current direct browser testing:

`orders`

- Create: `Any` or `Guests` if public visitors submit orders directly.
- Read: `Users`.
- Update: `Users`.
- Delete: `Users` or nothing.

`order_items`

- Create: `Any` or `Guests`.
- Read: `Users`.
- Update: `Users` or nothing.
- Delete: `Users` or nothing.

Security constraints:

- Do not allow public read on `orders` or `order_items`.
- Do not allow public update/delete on `orders` or `order_items`.
- Do not expose customer data with public read.
- Phase 8A adds a `createOrder` Appwrite Function; after deployment, remove public create permissions from these tables.

## Phase 6B - Completed

- Public booking can create `reservations` in Appwrite TablesDB.
- Public booking uses `restaurantId` from the restaurant loaded by slug, not from a public form field.
- `reservationMode` supports `whatsapp`, `database`, and `both`.
- WhatsApp fallback remains available if Appwrite create fails, and local form data is not discarded.
- `/admin/reservations` displays reservations scoped by the active restaurant only.
- Owners and staff manage reservations for their own restaurant through `useActiveRestaurantScope`.
- `agency_admin` without a selected restaurant sees the agency-scope warning instead of all reservations.
- Reservation status can be changed to `new`, `confirmed`, `completed`, or `cancelled`.
- Reservation details show customer data and notes without adding image upload, Functions, or automations.
- No Image Upload, Agency Dashboard, Appwrite Functions, or viaSocket integration was added.

### Phase 6B Appwrite permissions for staging

For current direct browser testing:

`reservations`

- Create: `Any` or `Guests`, plus `Users`.
- Read: `Users`.
- Update: `Users`.
- Delete: nothing, or `Users` temporarily only if you need delete testing.

Security constraints:

- Do not allow public read on `reservations`.
- Do not allow public update/delete on `reservations`.
- Do not expose customer data with public read.
- Phase 8B adds a `createReservation` Appwrite Function; after deployment, remove public create permissions from this table.

## Phase 7A - Completed

- `/admin/dishes` and `/admin/offers` can upload image files to Appwrite Storage.
- Upload accepts `image/jpeg`, `image/png`, and `image/webp` only.
- File size is limited to `3MB`.
- Uploaded files store `imageFileId` and `imageUrl` back into dishes/offers rows.
- Manual external `imageUrl` remains supported.
- Public dishes/offers continue to render uploaded images through stored `imageUrl`.
- No Gallery Manager, Logo Upload, Hero Upload, Agency Dashboard, Appwrite Functions, or viaSocket integration was added.

### Phase 7A Appwrite Storage permissions for staging

`restaurant-assets`

- Read: `Guests` or `Any`.
- Create: `Users`.
- Update: `Users`.
- Delete: `Users`.

Security constraints:

- Do not allow public create on the bucket.
- Do not allow public update/delete on the bucket.
- If file-level security remains enabled, the current frontend uploader adds public read to the uploaded file and keeps update/delete to the uploading user only.
- Production should move upload to an Appwrite Function or stricter team-scoped storage permissions.
- Unused uploaded files should be cleaned up later after failed saves or image replacements.

## Phase 7B - Completed

- `/admin/settings` يدعم رفع شعار المطعم وصورة Hero عبر Appwrite Storage.
- الشعار يحفظ `logoFileId` ويشتق الموقع العام رابط العرض من Storage.
- صورة Hero تحفظ `heroImageFileId` و`heroImageUrl` مع استمرار دعم الرابط اليدوي.
- Header/Hero في الموقع العام يستخدمان صور Appwrite مع fallback إلى `restaurantConfig.ts`.
- لا يوجد Gallery Manager، Agency Dashboard، Appwrite Functions، أو viaSocket في هذه المرحلة.

## Phase 7C - Completed

- `/admin/gallery` لإدارة صور معرض المطعم.
- Gallery items scoped دائمًا عبر `restaurantId` القادم من `useActiveRestaurantScope`.
- رفع صور المعرض يتم عبر Appwrite Storage و`AdminImageUploader`.
- دعم `imageUrl` يدوي بجانب الرفع.
- الصور المخفية لا تظهر في الموقع العام.
- Public gallery يقرأ من Appwrite مع fallback إلى `restaurantConfig.ts`.
- لا يوجد Agency Dashboard بعد.
- لا توجد Appwrite Functions بعد.
- لا يوجد viaSocket بعد.

### Phase 7C Appwrite permissions for staging

`gallery_items`

- Read: `Guests` أو `Any` حتى تظهر الصور للزائر العام.
- Create: `Users`.
- Update: `Users`.
- Delete: `Users`.

`restaurant-assets`

- Read: `Guests` أو `Any`.
- Create: `Users`.
- Update: `Users`.
- Delete: `Users`.

Security constraints:

- لا تسمح بـ public create على `gallery_items`.
- لا تسمح بـ public update/delete على `gallery_items`.
- لا تسمح بـ public upload على `restaurant-assets`.
- لا تقرأ كل `gallery_items` بدون `restaurantId`.
- لا تسمح بتعديل `restaurantId` من الفورم أو URL.
- React guards ليست حماية نهائية؛ يجب لاحقًا فرض الصلاحيات عبر Teams/Functions.
- يجب تنظيف الصور غير المستخدمة لاحقًا.
- لا تضع API key داخل React.

## Phase 8A - Completed

- Added `functions/createOrder` as a server-side Appwrite Function.
- Public checkout can call the Function when `VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID` is configured.
- Without the Function ID, checkout keeps the old browser `createOrder` path as a staging fallback.
- The Function resolves the active restaurant server-side from `restaurantSlug`.
- The Function validates customer fields and cart items.
- The Function recalculates dish prices for items with `dishId`.
- Offer/menu items without `dishId` still use client-provided price temporarily.
- TODO: Production must recalculate all official totals server-side from trusted dishes/offers/menu tables before payment.
- No reservation Function was added.
- No Agency Dashboard was added.
- No viaSocket integration was added.

### Phase 8A Appwrite permissions after Function verification

`orders`

- Create: public create can be removed after the Function is deployed and tested.
- Read: `Users` only.
- Update: `Users` only.
- Delete: preferably disabled, or `Users` temporarily for admin testing.

`order_items`

- Create: public create can be removed after the Function is deployed and tested.
- Read: `Users` only.
- Update: not needed in most flows.
- Delete: not needed in most flows.

Security constraints:

- The Function is responsible for public order creation.
- Never allow public read on `orders` or `order_items`.
- Keep `APPWRITE_API_KEY` only inside Function environment variables.
- Never add `VITE_APPWRITE_API_KEY`.
- Keep the old direct browser create path only as a staging fallback until permissions are hardened.

## Phase 8

Production security hardening.

## Phase 8B - Completed

- Added `functions/createReservation` as a server-side Appwrite Function.
- Public booking can call the Function when `VITE_APPWRITE_CREATE_RESERVATION_FUNCTION_ID` is configured.
- Without the Function ID, booking keeps the old browser `createReservation` path as a staging fallback.
- The Function resolves the active restaurant server-side from `restaurantSlug`.
- The Function validates customer name, phone, reservation date, time, and people count.
- No order Function changes were made.
- No Agency Dashboard was added.
- No viaSocket integration was added.

### Phase 8B Appwrite permissions after Function verification

`reservations`

- Create: public create can be removed after the Function is deployed and tested.
- Read: `Users` only.
- Update: `Users` only.
- Delete: preferably disabled, or `Users` temporarily for admin testing.

Security constraints:

- The Function is responsible for public reservation creation.
- Never allow public read on `reservations`.
- Keep `APPWRITE_API_KEY` only inside Function environment variables.
- Never add `VITE_APPWRITE_API_KEY`.
- Keep the old direct browser create path only as a staging fallback until permissions are hardened.
- Any changes under `functions/*` must be committed, pushed to GitHub, then redeployed in Appwrite.

## Phase 8C - Completed

- Production builds block direct browser writes to `orders`, `order_items`, and `reservations` when Function IDs are missing.
- Development/staging can still use direct Client SDK create fallback for local testing.
- Missing Function IDs in production show Arabic errors and optionally fall back to WhatsApp for `both` modes.
- Added `docs/appwrite/PRODUCTION_SECURITY_CHECKLIST.md`.
- Added final Appwrite permissions matrix for public content, sensitive tables, and `restaurant-assets`.
- No Agency Dashboard, viaSocket, billing, analytics, or new UI features were added.

## Phase 9

- Phase 9A completed: `/agency` foundation for `agency_admin` only.
- `/agency` lists restaurants from `restaurants` with basic stats, search, and status filters.
- Owner/staff accounts are blocked from `/agency` with a clear message.
- Phase 9B completed: `agency_admin` can select a restaurant from `/agency` and open `/admin` for that selected restaurant.
- For `agency_admin`, `/admin` uses client-side `selectedRestaurantId` as the active restaurant scope.
- For `owner` and `staff`, `/admin` still uses `profile.restaurantId`.
- If `agency_admin` opens `/admin` without selecting a restaurant, CRUD is blocked and the UI asks them to return to `/agency`.
- Phase 9C completed: `/agency` can create a client/restaurant through the `createClient` Appwrite Function.
- `createClient` creates the owner Auth user, restaurant row, owner profile, and default settings row.
- `createClient` verifies `role=agency_admin` server-side from `x-appwrite-user-id` and the `profiles` table.
- Phase 9D completed: manual Plans + Feature Flags + Client Status Control MVP.
- Plans are `starter`, `pro`, `premium`, and `managed`.
- Billing status is manual only: `trial`, `active`, `overdue`, `cancelled`.
- `/agency` can update client `status`, `plan`, `billingStatus`, `subscriptionEndsAt`, `trialEndsAt`, and `supportLevel`.
- `/admin` uses plan feature gating for orders, reservations, gallery, activity logs, dishes/offers, and brand customization.
- The public site shows draft/suspended/cancelled status messages instead of rendering an unavailable site as active.
- No payment gateway, invoices, recurring subscription provider, viaSocket, custom domains, public signup, delete client, or impersonation was added.
- No direct browser fallback exists for client creation.
- No impersonation was added.
- No real billing or subscriptions yet.
- No public signup was added.
- No delete restaurant flow.
- Security note: `selectedRestaurantId` in `localStorage` is MVP UI context only, not a final security boundary.
- Security note: `updateRestaurantAgencyControls` is a frontend MVP path only; move agency plan/status updates to an Appwrite Function that verifies `agency_admin`.
- Security note: agency restaurant reads/manage access should later move behind Appwrite Teams, Functions, or backend-enforced rules instead of relying only on React role guards and broad Appwrite read permissions.

## Future Phase 9 Work

- Phase 9I: Production deployment setup.
- Phase 9J: Subdomain resolver after hosting decision.
- Phase 9K: Custom domain resolver after DNS strategy.
- Create client repair flow for incomplete default settings, if needed.
- ربط Teams والصلاحيات والاشتراكات.
- تقوية restaurant list/manage عبر Function أو backend rules.
- لا يوجد impersonation في هذه المرحلة، ويجب إبقاءه خارج Phase 9C unless explicitly planned.

## Security Notes

- واجهة React لا تكفي وحدها لحماية multi-tenant.
- يجب لاحقًا فرض الصلاحيات عبر Appwrite Teams/Permissions أو Appwrite Functions.
- عمليات create/update/delete الحالية مناسبة كمرحلة staging/MVP فقط.
- لا يجب فتح public write على جداول `dishes` أو `offers` أو `site_settings` أو `faqs`.
- لا يجب السماح بتعديل `restaurantId` من الفورم أو query string.
- لا يجب query all dishes/offers/faqs بدون `restaurantId`.
- لا يجب السماح بتعديل `status` أو `teamId` أو `ownerUserId` من صفحة settings.
- لا تضع API keys داخل React أو `.env.local`.

## Phase 9E - Completed

- Public site supports `/r/:slug` for tenant-specific restaurant pages.
- `/` keeps using `VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG` for demo/development fallback.
- Explicit `/r/:slug` requests do not fall back to the demo restaurant when the slug is missing.
- Agency preview opens `/r/{restaurant.slug}` when the restaurant has a slug.
- Orders and reservations submit the current public route slug to the Appwrite Functions.
- Public `draft`, `suspended`, and `cancelled` statuses block the full site and show visitor-safe messages.
- Custom domains, subdomains, DNS management, billing, payment, and viaSocket were not implemented.

## Phase 9F - Completed

- `/agency` can manage domain metadata for each restaurant.
- `domainType`: `pixelone_path`, `subdomain`, `custom_domain`.
- `domainStatus`: `not_configured`, `pending_dns`, `pending_verification`, `active`, `failed`.
- Agency preview remains `/r/:slug`; subdomain/custom domain links are displayed as planned metadata only.
- Added general non-final DNS guidance in the agency modal.
- No DNS automation, domain purchasing, payment, invoices, viaSocket, subdomain routing, or custom domain routing was added.
- Commercial note: `/r/:slug` or future platform subdomain can be treated as the included platform link. Custom domains may require purchase/renewal by the client or a separate managed service, and domain cost is not pure agency profit.

## Phase 9G - Completed

- Added `docs/deployment/PRODUCTION_STRATEGY.md`.
- Added `docs/deployment/ENVIRONMENTS.md`.
- Added `docs/deployment/DEPLOYMENT_CHECKLIST.md`.
- Added `docs/deployment/DOMAIN_ROADMAP.md`.
- Documented frontend hosting options: Vercel or Appwrite Sites.
- Documented Appwrite Cloud, Appwrite Functions, Appwrite Storage, and TablesDB as the backend platform.
- Documented staging vs production environment separation.
- Documented that `/r/:slug` is the working public URL format.
- Documented that subdomain/custom domain metadata exists in `/agency`, but real routing is not active.
- No subdomain resolver, custom domain resolver, DNS automation, payment, billing, Appwrite schema change, or Function change was added.

## Phase 9H - Completed

- Added `scripts/exportClientData.mjs`.
- Added `npm run export:client -- --slug demo-restaurant`.
- Added `npm run export:client -- --restaurantId <rowId>`.
- The export script reads `.env.setup` and uses `node-appwrite` locally.
- The export script is read-only: no create, update, delete, upload, restore, or Storage download.
- Export output is written to `exports/{slug-or-restaurantId}/{timestamp}/`.
- Exported JSON files cover one restaurant and related rows from `site_settings`, `dishes`, `offers`, `faqs`, `gallery_items`, `orders`, `order_items`, `reservations`, `audit_logs`, and `profiles`.
- `order_items` export supports restaurantId first, then orderId fallback for schema compatibility.
- Added `docs/appwrite/BACKUP_EXPORT.md`.
- Added `exports/` to `.gitignore`.
- Restore/import, scheduled backups, cloud upload, React UI, agency dashboard button, Appwrite schema changes, and Function changes were not added.

## Upcoming Production Phases

- Phase 9I: Production deployment setup.
- Phase 9J: Subdomain resolver after hosting decision.
- Phase 9K: Custom domain resolver after DNS strategy.
