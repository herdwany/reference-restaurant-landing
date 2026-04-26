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

## Phase 6

- Orders + Reservations.
- إدارة حالات الطلبات والحجوزات.

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
