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
- `imageUrl` فقط حاليًا، بدون image upload.
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
- No image upload yet.

## Phase 4 - Completed

- `/admin/offers` لإدارة عروض المطعم.
- Offers scoped by `restaurantId`.
- Add/Edit/Activate/Deactivate/Delete offer.
- `imageUrl` فقط حاليًا، بدون image upload.
- لا يوجد Orders/Reservations بعد.
- لا يوجد Agency Dashboard بعد.

## Phase 4.5 - Completed

- Public site reads active offers from Appwrite.
- Fallback to `restaurantConfig.ts` when Appwrite is not configured, fails, restaurant is missing, or offers are empty.
- Inactive offers with `isActive=false` do not appear publicly.
- No orders/reservations yet.
- No image upload yet.
- No agency dashboard yet.

## Phase 5 - Completed

- `/admin/settings` لإدارة بيانات التواصل وإعدادات الموقع.
- `/admin/faqs` لإدارة الأسئلة الشائعة.
- Contact and site settings scoped by `restaurantId`.
- FAQ scoped by `restaurantId`.
- Public site reads settings and FAQ from Appwrite with fallback to `restaurantConfig.ts`.
- No orders/reservations yet.
- No image upload yet.
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
- Production should move `createOrder` to an Appwrite Function to validate input, recalculate prices from trusted dish data, set permissions, and add anti-spam protection.

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

## Phase 7

- Image Upload عبر Appwrite Storage.
- ضبط permissions للملفات حسب المطعم.

## Phase 8

- viaSocket Automations.
- إرسال أحداث محدودة مثل order created أو reservation created بدون secrets.

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
