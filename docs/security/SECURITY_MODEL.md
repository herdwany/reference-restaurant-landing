# Security Model

## العربية

### الأدوار

- `agency_admin`: صاحب الوكالة أو مدير النظام، يدير كل المطاعم والإعدادات التقنية.
- `owner`: صاحب المطعم، يدير محتوى وطلبات وحجوزات مطعمه فقط.
- `staff`: موظف المطعم، صلاحياته محدودة حسب دوره التشغيلي.
- `public visitor`: زائر الموقع العام.

### القواعد الأساسية

- الزائر العام يقرأ بيانات الموقع المنشورة فقط.
- الزائر العام لا يقرأ `orders`.
- الزائر العام لا يقرأ `reservations`.
- الزائر العام لا يعدل `dishes`, `offers`, أو `site_settings`.
- `owner` و`staff` يديرون مطعمهم فقط.
- `agency_admin` يدير كل المطاعم.
- كل عميل يساوي `restaurantId`.
- كل عميل سيكون له Appwrite Team لاحقاً.
- كل Row خاص بعميل يجب أن يحتوي `restaurantId`.
- لا نعتمد على إخفاء الأزرار في الواجهة كحماية.
- يجب استخدام Appwrite permissions وTeams عند بناء لوحة التحكم.
- كل العمليات الحساسة يجب أن تمر عبر Appwrite Functions لاحقاً.

### حدود الواجهة الأمامية

- لا Server SDK داخل React.
- لا API Keys أو أسرار داخل frontend.
- لا استدعاء Appwrite مباشرة من components.
- كل الوصول للبيانات يمر عبر repositories ثم `siteDataService`.

## Short English

Public visitors can only read published site data. They must never read orders, reservations, private settings, or tenant data from another restaurant. Owners and staff manage only their own restaurant. The agency admin can manage all tenants. Security must be enforced with Appwrite permissions, Teams, and Functions, not UI hiding.

