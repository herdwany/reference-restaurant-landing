# منصة مواقع مطاعم Pixel One Visuals

منصة SaaS مُدارة للمطاعم والكافيهات والمطابخ السحابية، مبنية لعرض المنيو والعروض واستقبال الطلبات والحجوزات والتواصل عبر واتساب.

## التشغيل

```bash
npm install
npm run dev
```

ثم افتح الرابط الذي يظهر في الطرفية.

لإنشاء نسخة إنتاجية:

```bash
npm run build
```

## تعديل بيانات المطعم

كل المحتوى القابل للتعديل موجود في:

```text
src/data/restaurantConfig.ts
```

من هذا الملف يمكنك تغيير:

- اسم المطعم والشعار والسlogan.
- رقم الهاتف ورقم واتساب والبريد والعنوان.
- ألوان الهوية الأساسية.
- صورة hero وصور الأطباق والعروض والمعرض.
- أسعار الأطباق والعروض والمنيو.
- روابط السوشيال والموقع وطرق الدفع.

## تغيير رقم واتساب

عدّل القيمة التالية:

```ts
whatsappNumber: "966551234567"
```

اكتب الرقم بصيغة دولية بدون علامة `+` حتى يعمل رابط `wa.me` بشكل صحيح.

## إضافة طبق جديد

داخل مصفوفة `dishes` أضف عنصراً جديداً:

```ts
{
  id: "new-dish",
  name: "اسم الطبق",
  description: "وصف مختصر",
  price: 35,
  image: "رابط الصورة",
  category: "الأطباق الرئيسية",
  rating: 4.8,
  isPopular: true,
  ingredients: ["مكون 1", "مكون 2"]
}
```

## إضافة عرض جديد

داخل مصفوفة `offers`:

```ts
{
  id: "new-offer",
  title: "عنوان العرض",
  description: "وصف العرض",
  price: 59,
  oldPrice: 85,
  image: "رابط الصورة",
  colorTheme: "orange",
  ctaText: "اطلب الآن"
}
```

القيم المتاحة لـ `colorTheme`: `orange` أو `red` أو `gold`.

## تخصيص الألوان

عدّل كائن `brand`:

```ts
brand: {
  primaryColor: "#E51B2B",
  secondaryColor: "#F97316",
  accentColor: "#FBBF24",
  successColor: "#22C55E"
}
```

الألوان تتحول تلقائياً إلى CSS variables وتنعكس على الأزرار والبطاقات والفوتر.

## إخفاء أو إظهار قسم

من `src/data/restaurantConfig.ts` عدّل قيم `settings.sections`:

```ts
settings: {
  sections: {
    offers: false,
    testimonials: true,
    gallery: true
  }
}
```

عند إخفاء قسم، يتم أيضاً إخفاء رابطه من الهيدر والفوتر إن كان مرتبطاً به.

## Appwrite

### Schema setup script

تمت إضافة سكريبت محلي لإنشاء Appwrite Schema تلقائياً:

```bash
npm run setup:appwrite
```

استخدم `.env.setup` لهذا السكريبت فقط، ولا تضع `APPWRITE_API_KEY` في `.env.local` أو داخل React. راجع `docs/appwrite/SETUP.md` للتفاصيل.

### Phase 2 completed

- `/admin/login` لتسجيل الدخول عبر Appwrite Auth.
- قراءة session الحالية من Appwrite Account.
- حماية `/admin` قبل عرض لوحة التحكم.
- Admin layout أولي فقط مع Sidebar وTopbar وOverview.
- لا يوجد CRUD في هذه المرحلة، ولا إدارة أطباق أو عروض أو طلبات أو حجوزات.

### Phase 2.5 completed

- تحميل `profile` للمستخدم المسجل من جدول `profiles`.
- تحديد الدور: `agency_admin` أو `owner` أو `staff`.
- تحميل بيانات المطعم الأساسية عند وجود `restaurantId`.
- حماية `/admin` حسب حالة profile والدور ونطاق المطعم.
- كل مستخدم admin يجب أن يكون لديه profile يدويًا في هذه المرحلة.
- `owner` و`staff` يحتاجان `restaurantId`.
- `agency_admin` مدعوم مبدئيًا بدون `restaurantId`، لكن لم يتم بناء `/agency` بعد.
- لا يوجد CRUD حتى الآن.

مثال row في جدول `profiles`:

```json
{
  "userId": "APPWRITE_USER_ID",
  "restaurantId": "RESTAURANT_ID",
  "teamId": "TEAM_ID_OPTIONAL",
  "role": "owner",
  "fullName": "اسم صاحب المطعم",
  "email": "owner@example.com",
  "phone": "0600000000",
  "isActive": true
}
```

### تجربة تسجيل الدخول

1. أضف متغيرات البيئة العامة فقط في `.env.local`:

```env
VITE_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_APPWRITE_PROJECT_ID="your-project-id"
VITE_APPWRITE_DATABASE_ID="your-database-id"
VITE_APPWRITE_BUCKET_ID="your-bucket-id"
VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG="demo-restaurant"
```

2. من Appwrite Console افتح المشروع ثم Auth > Users.
3. أنشئ مستخدمًا يدويًا ببريد وكلمة مرور.
4. انسخ User ID وأنشئ row يدويًا في جدول `profiles` بنفس `userId`.
5. للمالك أو الموظف، اربط profile بـ `restaurantId` موجود في جدول `restaurants`.
6. شغّل المشروع ثم افتح `/admin/login`.
7. سجّل الدخول بنفس البريد وكلمة المرور.

إذا لم تكن متغيرات Appwrite موجودة، ستبقى الصفحة الرئيسية تعمل من `src/data/restaurantConfig.ts`، وستعرض لوحة التحكم رسالة إعداد بدل الانهيار.

لم يتم بناء public signup أو forgot password أو social login أو Appwrite Functions أو viaSocket أو أي لوحة وكالة في هذه المرحلة.

تم تجهيز مرحلة Appwrite الأولى كطبقة اختيارية لا تغيّر عمل الموقع الحالي. بدون `.env.local` سيبقى الموقع يعمل من `src/data/restaurantConfig.ts`.

راجع:

- `docs/appwrite/SETUP.md`
- `docs/appwrite/SCHEMA.md`
- `docs/appwrite/SECURITY.md`
- `docs/appwrite/FUNCTIONS.md`
- `docs/appwrite/NEXT_STEPS.md`
- `docs/appwrite/PRODUCTION_SECURITY_CHECKLIST.md`
- `docs/security/SECURITY_MODEL.md`
- `docs/security/THREAT_MODEL.md`
- `docs/security/THIRD_PARTY_TOOLS.md`
- `docs/security/CLIENT_ACCESS_POLICY.md`
- `docs/security/BACKUP_POLICY.md`

## أقسام قابلة للتحكم

- `hero`
- `trustBadges`
- `featuredDishes`
- `offers`
- `gallery`
- `testimonials`
- `actionGrid`
- `faq`
- `footer`

## ملاحظات

- السلة ما زالت تستخدم `localStorage` محليًا، والحجوزات تحتفظ أيضًا بـ fallback محلي حتى لا تضيع بيانات العميل.
- إتمام الطلب يدعم `orderMode`: واتساب فقط، قاعدة البيانات فقط، أو الحفظ في Appwrite ثم فتح واتساب.
- نموذج الحجز يدعم `reservationMode`: واتساب فقط، قاعدة البيانات فقط، أو الحفظ في Appwrite ثم فتح واتساب.
- كل روابط الهيدر تعمل بسلاسة، ورابط المعرض يفتح قسماً تفاعلياً قابل للتوسعة.

## FINALIZATION_BATCH_1_PRODUCT_AND_RESTAURANT_OPERATIONS

- الصفحة العامة `/r/:slug` أصبحت تستخدم تخصيص homepage فعليًا: hero layout، theme preset، image/video، عناوين الأقسام، وإظهار/إخفاء الأقسام.
- `ar/fr/en` مدعومة للواجهة والمحتوى الأساسي. محتوى الأطباق والعروض والأسئلة والصفحة الرئيسية يستخدم حقل `translations` كـ JSON نصي اختياري مع fallback للحقول الأساسية.
- أضيفت صفحة تتبع بدون login: `/r/:slug/track`.
- الطلبات والحجوزات تنشئ `trackingCode`، والتتبع يتم عبر Function باسم `trackRequest` ولا يحتاج public read على الجداول الحساسة.
- حجوزات المطاعم تدعم تأكيدًا يدويًا وعربونًا يدويًا للمجموعات الكبيرة بدون payment gateway.
- حالات الطلبات والحجوزات توسعت لتناسب تشغيل المطاعم.
- لم تتم إضافة payment gateway أو billing provider أو viaSocket أو customer accounts أو subdomain/custom domain resolver.

### Demo readiness checklist

- افتح `/r/demo-restaurant` لمعاينة موقع مطعم جاهز.
- جرّب LanguageSwitcher بين `ar`, `fr`, و`en`.
- جرّب إضافة طبق أو عرض إلى السلة وإرسال order demo.
- جرّب reservation demo بعدد أشخاص يتجاوز threshold لرؤية رسالة العربون اليدوي.
- بعد إنشاء طلب/حجز عبر Appwrite Functions، جرّب `/r/demo-restaurant/track` باستخدام الهاتف و`trackingCode`.
- من `/admin/settings` جرّب تخصيص Hero، عناوين الأقسام، الترجمات، وسياسات الحجز حسب الخطة.

## Phase 3 - Admin CMS Foundation

- تم إضافة مكونات Admin CMS قابلة لإعادة الاستخدام.
- تم إضافة `/admin/dishes` لإدارة الأطباق والمنيو فقط.
- كل عمليات الأطباق scoped عبر `restaurantId` القادم من `AuthContext`، وليس من الفورم أو الرابط.
- يمكن إضافة طبق، تعديل طبق، إخفاء/إظهار طبق عبر `isAvailable`.
- الحذف النهائي موجود كإجراء ثانوي مع confirm واضح.
- يدعم الآن `imageUrl` اليدوي، وتمت إضافة upload حقيقي لاحقًا في Phase 7A للأطباق والعروض فقط.
- لم يتم بناء Offers Manager أو Orders Manager أو Reservations Manager أو Settings Manager أو Agency Dashboard في هذه المرحلة.

## Phase 3.5 - Public Dishes Binding

- تم ربط قسم الأطباق في الموقع العام بقراءة الأطباق المتاحة من Appwrite.
- إذا كان Appwrite غير مفعّل أو فشل الاتصال أو لم توجد أطباق، يرجع الموقع إلى `restaurantConfig.ts`.
- الأطباق المخفية `isAvailable=false` لا تظهر في الموقع العام.
- لم يتم ربط الطلبات أو الحجوزات بعد.
- الصور المرفوعة لاحقًا عبر Phase 7A تظهر أيضًا في الموقع العام عبر `imageUrl`.

## Phase 4 - Offers Manager

- تم إضافة `/admin/offers` لإدارة عروض المطعم داخل لوحة التحكم.
- كل عمليات العروض scoped عبر `restaurantId` القادم من `useActiveRestaurantScope`.
- يمكن إضافة عرض، تعديل عرض، تفعيل/إيقاف عرض، وحذف عرض مع confirm.
- يدعم الآن `imageUrl` اليدوي، وتمت إضافة upload حقيقي لاحقًا في Phase 7A للأطباق والعروض فقط.
- لا يوجد Orders/Reservations أو Agency Dashboard بعد.

## Phase 4.5 - Public Offers Binding

- تم ربط قسم عروض اليوم في الموقع العام بقراءة العروض النشطة من Appwrite.
- إذا كان Appwrite غير مفعّل أو فشل الاتصال أو لم توجد عروض، يرجع الموقع إلى `restaurantConfig.ts`.
- العروض المتوقفة `isActive=false` لا تظهر في الموقع العام.
- لا يوجد Orders/Reservations أو Agency Dashboard بعد، وصور العروض المرفوعة لاحقًا عبر Phase 7A تظهر أيضًا هنا.

## Phase 5 - Contact, Settings, FAQ

- تم إضافة `/admin/settings` لإدارة بيانات المطعم والتواصل والهوية وإعدادات ظهور الأقسام.
- تم إضافة `/admin/faqs` لإدارة الأسئلة الشائعة scoped حسب `restaurantId`.
- الموقع العام يقرأ contact/settings وFAQ الظاهرة من Appwrite مع fallback إلى `restaurantConfig.ts`.
- `restaurantId` يأتي من `AuthContext` و`useActiveRestaurantScope` فقط، ولا يظهر أو يتغير من الفورم.
- لا يوجد Orders/Reservations بعد.
- لا يوجد Image Upload داخل settings بعد.
- لا يوجد Agency Dashboard بعد.

## Phase 6A - Orders

- تم إضافة `/admin/orders` لإدارة طلبات المطعم الحالي فقط.
- الموقع العام يحفظ `orders` و`order_items` في Appwrite عند تفعيل `database` أو `both`.
- `restaurantId` في الطلب العام يأتي من المطعم المحمّل بالـ slug، وليس من مدخلات العميل.
- تغيير حالة الطلب يتم من لوحة التحكم بعد التحقق من أن الطلب تابع لنفس `activeRestaurantId`.
- زر الرد عبر واتساب يفتح رسالة جاهزة للعميل حسب حالة الطلب.
- السلة وfallback واتساب ما زالا يعملان، ولا توجد إدارة حجوزات أو رفع صور أو لوحة وكالة في هذه المرحلة.
- للاختبار: افتح Create فقط على `orders` و`order_items` للزوار إذا أردت الحفظ المباشر من الموقع، مع عدم فتح public read/update/delete.

## Phase 6B - Reservations

- تم إضافة `/admin/reservations` لإدارة حجوزات المطعم الحالي فقط.
- نموذج الحجز العام يحفظ `reservations` في Appwrite عند تفعيل `reservationMode` إلى `database` أو `both`.
- إذا كان `reservationMode=whatsapp` يبقى الحجز عبر واتساب فقط من دون حفظ في Appwrite.
- عند فشل Appwrite لا تضيع بيانات الحجز: تبقى قيم النموذج محليًا ويتم فتح واتساب كبديل.
- `restaurantId` في الحجز العام يأتي من المطعم المحمّل بالـ slug داخل `getSiteData` وليس من أي input عام.
- `/admin/reservations` يقرأ الحجوزات scoped عبر `useActiveRestaurantScope` و`restaurantId` فقط.
- تغيير حالة الحجز إلى `new` أو `confirmed` أو `completed` أو `cancelled` يتحقق أولًا من أن الحجز تابع لنفس `activeRestaurantId`.
- زر الرد عبر واتساب يفتح رسالة جاهزة للعميل بناءً على اسم المطعم وتاريخ الحجز ووقته وحالته.

### Phase 6B Appwrite permissions for staging

For current direct browser testing:

`reservations`

- Create: `Any` أو `Guests` و`Users`.
- Read: `Users`.
- Update: `Users`.
- Delete: لا شيء، أو `Users` مؤقتًا فقط إذا احتجت اختبار الحذف.

Security constraints:

- لا تفعّل public read على `reservations`.
- لا تفعّل public update/delete على `reservations`.
- لا تفتح customer data للقراءة العامة.
- في الإنتاج استخدم `createReservation` Appwrite Function، ثم أزل public create من جدول `reservations`.

## Phase 7A - Image Upload

- تم إضافة upload محدود وآمن للصور داخل `/admin/dishes` و`/admin/offers` فقط.
- يمكن للمستخدم رفع `JPG` أو `PNG` أو `WebP` حتى `3MB`.
- يتم حفظ `imageFileId` و`imageUrl` في rows الخاصة بالأطباق والعروض.
- يبقى `imageUrl` اليدوي مدعومًا إذا أراد المالك استخدام رابط خارجي بدل Appwrite Storage.
- الموقع العام يعرض الصور المرفوعة لأن `imageUrl` المحفوظ يأتي من `Storage.getFileView`.
- إزالة الصورة من النموذج لا تحذف الملف فعليًا في هذه المرحلة، لتجنب فقدان البيانات.

### Phase 7A Appwrite Storage permissions for staging

`restaurant-assets`

- Read: `Guests` أو `Any` حتى تظهر الصور في الموقع العام.
- Create: `Users`.
- Update: `Users`.
- Delete: `Users`.

Security constraints:

- لا تفعّل `public create` على الـ bucket.
- لا تفعّل `public update/delete` على الـ bucket.
- إذا بقي `fileSecurity` مفعّلًا، فالواجهة الحالية تضيف `public read` على الملف المرفوع وتُبقي `update/delete` للمستخدم الرافع فقط.
- في الإنتاج، الأفضل نقل upload إلى Appwrite Function أو ربطه بصلاحيات فرق أدق حسب المطعم.
- يجب تنظيف الصور غير المستخدمة لاحقًا عند فشل حفظ الصف أو استبدال الصورة.

الخطوات القادمة:

- Phase 9B: مكتملة. `agency_admin` يختار مطعمًا من `/agency` ثم يفتح `/admin` لإدارة ذلك المطعم عبر `selectedRestaurantId` المخزن client-side كسياق MVP فقط.
- Phase 9C: مكتملة. `agency_admin` يستطيع إنشاء عميل/مطعم من `/agency` عبر Appwrite Function باسم `createClient`، بدون API key داخل React وبدون public signup.
- Phase 9D: مكتملة. تمت إضافة Plans يدوية `starter/pro/premium/managed`، وحالة دفع يدوية، وتحكم حالة العميل/الموقع، وFeature Flags MVP حسب الباقة.
- `/agency` يعرض الخطة وحالة الدفع والدعم وحالة الموقع لكل عميل، ويحتوي نافذة “إدارة الباقة” لتحديث الحقول المسموحة فقط.
- `/admin` يطبق feature gating للطلبات والحجوزات والمعرض وسجل النشاط وتخصيص الهوية، مع رسائل ترقية واضحة للمالك والموظف.
- الموقع العام يعرض رسائل `draft/suspended/cancelled` بدل الموقع النشط عند تعطيل العميل.
- Phase 9D لا يحتوي payment gateway، ولا invoices، ولا billing provider، ولا subscriptions حقيقية، ولا viaSocket، ولا impersonation، ولا domain routing.
- سلوك `owner` و`staff` بقي عبر `profile.restaurantId`.
- الخطوة التالية المقترحة: Phase 9J - Subdomain resolver after hosting decision.

ملاحظة أمنية: واجهة React وحدها لا تكفي لحماية multi-tenant. `selectedRestaurantId` في `localStorage` هو سياق واجهة فقط وليس boundary أمني نهائي، و`updateRestaurantAgencyControls` مسار MVP من الواجهة يجب نقله لاحقًا إلى Appwrite Function تتحقق من `agency_admin`. Feature flags ليست حماية نهائية للبيانات الحساسة. لاحقًا يجب حماية agency access وrestaurant list/manage عبر Teams/Functions/backend rules. `createOrder` و`createReservation` لديهما Appwrite Functions ومسار production guard يمنع direct browser write عند غياب Function IDs. بعد اختبار Functions أزل public create من جداول الطلبات والحجوزات، ولا تفتح public read على بيانات العملاء أو تضع API keys داخل React.

## Phase 9E - Dynamic Public Routing by Slug

- The public site supports `/r/:slug` for tenant-specific restaurant pages.
- `/` still uses `VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG` for demo/development fallback.
- `/r/:slug` loads the matching restaurant from Appwrite and shows a visitor-safe not found page when the slug does not exist.
- `draft`, `suspended`, and `cancelled` restaurants show public status messages instead of the full site.
- Agency preview opens `/r/{restaurant.slug}` when a slug is available.
- Public orders and reservations now submit the current route slug to the Appwrite Functions.
- Custom domains, subdomain routing, DNS management, billing, payment, and viaSocket are not implemented in this phase.

## Phase 9F - Domain Metadata Management

- `/agency` can manage domain metadata for each restaurant without enabling real domain routing yet.
- `domainType` supports `pixelone_path`, `subdomain`, and `custom_domain`.
- `domainStatus` lifecycle supports `not_configured`, `pending_dns`, `pending_verification`, `active`, and `failed`.
- Agency cards show the current public link `/r/{slug}` plus planned subdomain/custom domain metadata.
- Public preview remains `/r/:slug` until resolver work is implemented.
- No DNS automation, domain purchasing, payment, invoices, viaSocket, subdomain routing, or custom domain routing was added.
- Commercial note: `/r/:slug` or platform subdomain can be included as the platform link; custom domains may require client-side purchase/renewal or a separate managed service. Domain cost is not pure agency profit and should be documented in offers.

## Production / Deployment

- Current public client URL format: `/r/:slug`.
- Demo/default public URL: `/`.
- Admin URL: `/admin`.
- Agency URL: `/agency`.
- Domain management in `/agency` is metadata-only for now.
- Subdomains and custom domains require a future resolver, DNS strategy, SSL behavior, and hosting setup before they can serve public sites.
- Production strategy docs live in `docs/deployment/`.
- Production deployment setup starts from `.env.production.example`.
- Staging deployment setup starts from `.env.staging.example`.
- Main deployment docs: `PRODUCTION_DEPLOYMENT.md`, `FRONTEND_HOSTING_OPTIONS.md`, and `POST_DEPLOYMENT_TESTS.md`.

## Phase 9G - Production Hosting Strategy

- Added production hosting strategy documentation for Vercel or Appwrite Sites frontend hosting with Appwrite Cloud backend services.
- Documented staging vs production environment separation and the allowed frontend `VITE_*` variables.
- Added production deployment checklist covering builds, Functions, permissions, routing, roles, and operations.
- Added a domain roadmap that keeps `/r/:slug` as the working URL while subdomain/custom domain routing remains future work.
- No DNS automation, subdomain resolver, custom domain resolver, billing, payment, Appwrite schema change, or Function change was added.

## Phase 9H - Backup / Export Client Data

- Added local read-only export script: `npm run export:client -- --slug demo-restaurant`.
- Export can also run by restaurant row ID: `npm run export:client -- --restaurantId <rowId>`.
- The script reads `.env.setup`, uses `node-appwrite` Server SDK locally, and does not use any `VITE_*` environment variables.
- Export files are written to `exports/{slug-or-restaurantId}/{timestamp}/`.
- Exported tables include restaurant, settings, dishes, offers, FAQs, gallery, orders, order items, reservations, audit logs, and profiles scoped to the restaurant.
- `exports/` is ignored by Git because it can contain sensitive customer data.
- Restore/import, scheduled backups, cloud upload, React UI, agency export button, Storage asset downloads, schema changes, and Function changes were not added.

## Phase 9I - Production Deployment Setup

- Added `.env.production.example` and `.env.staging.example` with public Vite variables only.
- Added production deployment guide, frontend hosting options, and post-deployment test checklist under `docs/deployment/`.
- Documented the recommended first deployment path: Vercel frontend with Appwrite Cloud backend.
- Documented Appwrite Sites as an alternative hosting option.
- Updated Function deployment notes for `createOrder`, `createReservation`, and `createClient`.
- Updated production security checklist to include Function execute access and sensitive table rules.
- Added `npm run build:production` as a production build alias.
- No routing, schema, Function logic, repositories, feature gates, billing, payment, viaSocket, subdomain resolver, or custom domain resolver was added.

## Phase 10 - First Client Sales Package

- Added `docs/sales/` with sales and onboarding material for the first local restaurant client.
- Added offer packages for Starter, Pro, Premium, and Managed.
- Added client-facing included/not-included scope notes.
- Added first-client onboarding checklist and demo script.
- Added outreach messages in simple Arabic and light Moroccan Darija.
- Added client data checklist, support policy, and Morocco pricing notes.
- No React UI, Appwrite schema, Functions, billing, payment, viaSocket, subdomain resolver, or custom domain resolver changes were added.

## Phase 10A - Multilingual + Homepage Customization Foundation

- Added global i18n foundation for `ar`, `fr`, and `en`.
- Arabic uses RTL, while French and English use LTR across public, `/admin`, and `/agency`.
- Added a language switcher foundation to the public header, admin topbar, and agency header.
- Added homepage customization fields for hero copy, CTA text, media type, image/video URLs, section titles, section visibility, theme preset, and hero layout preset.
- `/admin/settings` now exposes homepage customization with plan-aware gating: Starter basic hero text, Pro brand/homepage controls, Premium/Managed advanced theme/layout/video controls, and agency admin bypass.
- Public pages use the saved homepage customization with safe fallbacks.
- Removed public template/badge wording from the visitor-facing site.
- No drag/drop builder, content translation manager, payment, viaSocket, domain resolver, or non-food business verticals were added.

Next planned phase: Phase 10B - Full homepage customization polish.
