# Next Steps

## Phase 2

- بناء `/admin` login.
- قراءة session من Appwrite Auth.
- لوحة عميل بسيطة.
- إدارة الأطباق والعروض فقط.

## Phase 3

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
