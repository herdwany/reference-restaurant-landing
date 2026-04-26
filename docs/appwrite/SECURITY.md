# Security Plan

## Roles

- `agency_admin`: صاحب الوكالة أو مدير النظام.
- `owner`: صاحب المطعم.
- `staff`: موظف المطعم.
- `public visitor`: زائر الموقع.

## Security Rules

- الزائر يستطيع قراءة بيانات الموقع المنشورة فقط.
- الزائر لا يستطيع قراءة الطلبات أو الحجوزات.
- الزائر لا يستطيع تعديل الأطباق أو العروض أو الإعدادات.
- `owner` و`staff` يستطيعون إدارة بيانات مطعمهم فقط.
- `agency_admin` يستطيع إدارة كل المطاعم.
- كل مطعم يجب أن يكون له Team خاص في Appwrite.
- كل Row يجب أن يحتوي `restaurantId` عندما يكون تابعاً لمطعم.
- لا تعتمد فقط على إخفاء الأزرار في الواجهة.
- يجب استعمال Appwrite permissions وTeams لاحقاً عند بناء لوحة التحكم.

## Public Reads

الجداول العامة المقترحة للقراءة من الموقع:

- `restaurants` للصفوف active فقط.
- `dishes` للصفوف `isAvailable = true`.
- `offers` للصفوف `isActive = true`.
- `gallery_items` للصفوف `isVisible = true`.
- `testimonials` للصفوف `isVisible = true`.
- `faqs` للصفوف `isVisible = true`.
- `site_settings` للعرض العام فقط.

## Orders and Reservations

في نسخة إنتاج multi-tenant، الأفضل ألا ينشئ المتصفح الطلبات والحجوزات مباشرة في TablesDB.

الأفضل لاحقاً استخدام Appwrite Functions:

- `createOrder`
- `createReservation`

السبب:

- validate input
- set permissions safely
- prevent public read
- prevent malicious `restaurantId` manipulation
- add anti-spam checks later
- normalize totals and prices from trusted data

لا يتم تنفيذ هذه Functions في المرحلة الحالية.

## Frontend Secrets

- لا تضع API Keys في React.
- لا تستخدم Server SDK داخل الواجهة الأمامية.
- متغيرات `VITE_` عامة بطبيعتها وتظهر في bundle، لذلك استخدمها فقط لـ endpoint/project/database/bucket IDs.

