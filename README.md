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
