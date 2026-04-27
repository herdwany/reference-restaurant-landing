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
- Production should move `createReservation` to an Appwrite Function to validate input, add anti-spam protection, and set tighter permissions.

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

## Phase 8B

- Move `createReservation` to an Appwrite Function after order hardening is reviewed.

## Phase 9

- Agency Dashboard.
- إنشاء مطاعم جديدة.
- اختيار مطعم كـ`selectedRestaurantId`.
- ربط Teams والصلاحيات والاشتراكات.

## Security Notes

- واجهة React لا تكفي وحدها لحماية multi-tenant.
- يجب لاحقًا فرض الصلاحيات عبر Appwrite Teams/Permissions أو Appwrite Functions.
- عمليات create/update/delete الحالية مناسبة كمرحلة staging/MVP فقط.
- لا يجب فتح public write على جداول `dishes` أو `offers` أو `site_settings` أو `faqs`.
- لا يجب السماح بتعديل `restaurantId` من الفورم أو query string.
- لا يجب query all dishes/offers/faqs بدون `restaurantId`.
- لا يجب السماح بتعديل `status` أو `teamId` أو `ownerUserId` من صفحة settings.
- لا تضع API keys داخل React أو `.env.local`.
