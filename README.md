# قالب مطعم عربي React + TypeScript

قالب صفحة هبوط عربية RTL للمطاعم والكافيهات والمطابخ السحابية، مبني لزيادة الطلبات والحجوزات والتواصل عبر واتساب.

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
- `docs/appwrite/NEXT_STEPS.md`
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

## Phase 3 - Admin CMS Foundation

- تم إضافة مكونات Admin CMS قابلة لإعادة الاستخدام.
- تم إضافة `/admin/dishes` لإدارة الأطباق والمنيو فقط.
- كل عمليات الأطباق scoped عبر `restaurantId` القادم من `AuthContext`، وليس من الفورم أو الرابط.
- يمكن إضافة طبق، تعديل طبق، إخفاء/إظهار طبق عبر `isAvailable`.
- الحذف النهائي موجود كإجراء ثانوي مع confirm واضح.
- `imageUrl` فقط حاليًا، ولا يوجد image upload بعد.
- لم يتم بناء Offers Manager أو Orders Manager أو Reservations Manager أو Settings Manager أو Agency Dashboard في هذه المرحلة.

## Phase 3.5 - Public Dishes Binding

- تم ربط قسم الأطباق في الموقع العام بقراءة الأطباق المتاحة من Appwrite.
- إذا كان Appwrite غير مفعّل أو فشل الاتصال أو لم توجد أطباق، يرجع الموقع إلى `restaurantConfig.ts`.
- الأطباق المخفية `isAvailable=false` لا تظهر في الموقع العام.
- لم يتم ربط الطلبات أو الحجوزات بعد.
- لا يوجد image upload بعد، ويتم استخدام `imageUrl` فقط عند توفره.

## Phase 4 - Offers Manager

- تم إضافة `/admin/offers` لإدارة عروض المطعم داخل لوحة التحكم.
- كل عمليات العروض scoped عبر `restaurantId` القادم من `useActiveRestaurantScope`.
- يمكن إضافة عرض، تعديل عرض، تفعيل/إيقاف عرض، وحذف عرض مع confirm.
- `imageUrl` فقط حاليًا، ولا يوجد image upload بعد.
- لا يوجد Orders/Reservations أو Agency Dashboard بعد.

## Phase 4.5 - Public Offers Binding

- تم ربط قسم عروض اليوم في الموقع العام بقراءة العروض النشطة من Appwrite.
- إذا كان Appwrite غير مفعّل أو فشل الاتصال أو لم توجد عروض، يرجع الموقع إلى `restaurantConfig.ts`.
- العروض المتوقفة `isActive=false` لا تظهر في الموقع العام.
- لا يوجد Orders/Reservations أو Image Upload أو Agency Dashboard بعد.

## Phase 5 - Contact, Settings, FAQ

- تم إضافة `/admin/settings` لإدارة بيانات المطعم والتواصل والهوية وإعدادات ظهور الأقسام.
- تم إضافة `/admin/faqs` لإدارة الأسئلة الشائعة scoped حسب `restaurantId`.
- الموقع العام يقرأ contact/settings وFAQ الظاهرة من Appwrite مع fallback إلى `restaurantConfig.ts`.
- `restaurantId` يأتي من `AuthContext` و`useActiveRestaurantScope` فقط، ولا يظهر أو يتغير من الفورم.
- لا يوجد Orders/Reservations بعد.
- لا يوجد Image Upload بعد.
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
- في الإنتاج يجب نقل `createReservation` إلى Appwrite Function للتحقق من المدخلات ومنع spam وضبط permissions.

الخطوات القادمة:

- Phase 7: Image Upload.
- Phase 8: viaSocket Automations.
- Phase 9: Agency Dashboard.

ملاحظة أمنية: واجهة React وحدها لا تكفي لحماية multi-tenant. يجب لاحقًا نقل `createOrder` و`createReservation` إلى Appwrite Function لإعادة التحقق من المدخلات ومنع spam وضبط permissions، ولا يجب فتح public read على بيانات العملاء أو وضع API keys داخل React.
