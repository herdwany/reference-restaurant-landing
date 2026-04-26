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

- السلة والحجوزات محفوظة في `localStorage`.
- إتمام الطلب يفتح واتساب برسالة منسقة تحتوي المنتجات والكميات والإجمالي.
- نموذج الحجز يتحقق من الحقول قبل الحفظ أو الإرسال عبر واتساب.
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
- لم يتم ربط العروض أو الطلبات أو الحجوزات بعد.
- لا يوجد image upload بعد، ويتم استخدام `imageUrl` فقط عند توفره.

الخطوات القادمة:

- Phase 4: Offers Manager.
- Phase 5: Contact/FAQ/Settings.
- Phase 6: Orders/Reservations.
- Phase 7: Image Upload.
- Phase 8: viaSocket Automations.
- Phase 9: Agency Dashboard.

ملاحظة أمنية: واجهة React وحدها لا تكفي لحماية multi-tenant. يجب لاحقًا فرض الصلاحيات عبر Appwrite Teams/Permissions أو Appwrite Functions، ولا يجب فتح public write أو وضع API keys داخل React.
