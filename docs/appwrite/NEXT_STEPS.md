# Next Steps

## Phase 2

- بناء `/admin` login.
- قراءة session من Appwrite Auth.
- لوحة عميل بسيطة.
- Admin layout shell فقط.
- لا يوجد CRUD في هذه المرحلة.

## Phase 2.5

- تحميل profile من جدول `profiles` بعد تسجيل الدخول.
- تحديد الدور: `agency_admin` أو `owner` أو `staff`.
- ربط `owner` و`staff` بـ `restaurantId`.
- تحميل بيانات المطعم الأساسية عند وجود `restaurantId`.
- منع الدخول إذا لم يوجد profile أو كان `isActive=false`.
- `agency_admin` مدعوم مبدئيًا بدون بناء `/agency` الآن.
- الحسابات و profiles تنشأ يدويًا حاليًا من Appwrite Console.

مثال profile:

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

## Phase 3

- بداية CRUD بعد تثبيت الصلاحيات.
- إدارة الأطباق والعروض.
- إدارة FAQ.
- إدارة معلومات التواصل.
- إدارة المعرض.
- إدارة التقييمات.

## Phase 4

- نقل الطلبات والحجوزات إلى Appwrite.
- إدارة `order status`.
- إدارة `reservation status`.

## Phase 5

- بناء `/agency dashboard`.
- إنشاء مطعم جديد.
- ربط Team لكل مطعم.
- إدارة العملاء.

## Phase 6

- Appwrite Functions:
  - `createTenant`
  - `createOrder`
  - `createReservation`
  - `uploadAsset`
  - `auditLog`

## Functions Plan

### createTenant

- ينشئ `restaurant`.
- ينشئ Team.
- يربط owner.
- يضبط permissions.

### createOrder

- يتحقق من input.
- لا يثق بـ `restaurantId` من المستخدم.
- يحفظ `order` و`order_items`.
- يكتب audit log.
- يرسل event إلى viaSocket لاحقاً.

### createReservation

- يتحقق من input.
- يحفظ reservation.
- يرسل event إلى viaSocket لاحقاً.

### sendAutomationEvent

- يرسل payload محدود إلى viaSocket.
- لا يرسل secrets.
- لا يرسل بيانات زائدة.

### backupRestaurant

- يصدر بيانات مطعم معين JSON.

لا يتم تنفيذ Functions في هذه المرحلة.
