# Appwrite Setup

## خطوات الإعداد بالعربية

1. أنشئ مشروعاً جديداً في `cloud.appwrite.io`.
2. أضف Web platform:
   - `localhost` للتطوير.
   - الدومين الحقيقي عند النشر.
3. انسخ `Project ID`.
4. أنشئ API Key مؤقت للإعداد المحلي فقط من Appwrite Console.
5. أعطِ المفتاح صلاحيات الإعداد المطلوبة فقط:
   - `databases.read`
   - `databases.write`
   - `tables.read`
   - `tables.write`
   - `columns.read`
   - `columns.write`
   - `indexes.read`
   - `indexes.write`
   - `rows.read`
   - `rows.write`
   - `buckets.read`
   - `buckets.write`
6. انسخ `.env.setup.example` إلى `.env.setup` محلياً.
7. ضع قيم الإعداد الخاصة بالسكريبت:

```bash
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_local_setup_api_key
APPWRITE_DATABASE_ID=pixelone_main
APPWRITE_BUCKET_ID=restaurant-assets
APPWRITE_DEFAULT_RESTAURANT_SLUG=demo-restaurant
```

8. شغّل سكريبت الإعداد:

```bash
npm run setup:appwrite
```

السكريبت ينشئ Database وBucket وTables وColumns وIndexes بشكل idempotent قدر الإمكان. إذا كان مورد موجوداً سيطبع `already exists`، وإذا فشل index بسبب limitation سيطبع warning ويكمل.

9. انسخ `RESTAURANT_ROW_ID` الذي يظهر في نهاية السكريبت.
10. أنشئ مستخدمًا يدويًا من `Auth > Users`.
11. أنشئ row يدويًا في جدول `profiles` واربطه بـ User ID و`RESTAURANT_ROW_ID`:

```json
{
  "userId": "APPWRITE_USER_ID",
  "restaurantId": "RESTAURANT_ROW_ID",
  "teamId": "TEAM_ID_OPTIONAL",
  "role": "owner",
  "fullName": "اسم صاحب المطعم",
  "email": "owner@example.com",
  "phone": "0600000000",
  "isActive": true
}
```

12. انسخ `.env.example` إلى `.env.local` محلياً للواجهة.
13. ضع القيم العامة فقط:

```bash
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=pixelone_main
VITE_APPWRITE_BUCKET_ID=restaurant-assets
VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG=demo-restaurant
VITE_ENABLE_ANALYTICS=false
```

لا تضع أي API Key أو viaSocket secret أو Server secret في ملفات `VITE_`.

14. شغّل:

```bash
npm run dev
```

15. اختبر الموقع بدون `.env.local`. يجب أن يعمل من `restaurantConfig.ts`.
16. اختبر الموقع مع `.env.local` ناقص أو غير مضبوط. يجب ألا ينهار، ويعود إلى fallback.

## الفرق بين ملفات البيئة

### `.env.setup`

- يستعمله `scripts/setupAppwrite.mjs` فقط.
- يحتوي `APPWRITE_API_KEY`.
- لا يقرأه React ولا Vite.
- محمي في `.gitignore`.
- لا ترفعه إلى GitHub.

### `.env.local`

- يستعمله React/Vite.
- يحتوي قيم `VITE_APPWRITE_*` العامة فقط.
- لا يحتوي `APPWRITE_API_KEY` إطلاقاً.
- لا تستخدم فيه Server SDK أو أي secret.

## Short English Setup

1. Create an Appwrite Cloud project.
2. Add a Web platform for `localhost` and your production domain.
3. Copy the Project ID.
4. Create a local setup API key with database, tables, columns, indexes, rows, and buckets read/write scopes.
5. Copy `.env.setup.example` to `.env.setup`.
6. Run `npm run setup:appwrite`.
7. Copy the printed `RESTAURANT_ROW_ID`.
8. Create an Auth user manually.
9. Create a profile row manually in `profiles`.
10. Copy `.env.example` to `.env.local` with public `VITE_*` values only.
11. Run `npm run dev`.
12. Verify the app still works without Appwrite configured.

## Storage Bucket

Bucket name suggestion:

```text
restaurant-assets
```

الاستخدام:

- logos
- browser tab icons
- hero images
- dish images
- offer images
- gallery images
- avatars

الصلاحيات المقترحة:

- public read للصور المنشورة فقط.
- create/update/delete للـ `Users`.
- لا تسمح للزائر العام برفع الصور.

الرفع مدعوم الآن داخل `/admin/dishes` و`/admin/offers` فقط.

ملاحظة مهمة:

- إذا كان `fileSecurity` مفعّلًا على الـ bucket، فواجهة الرفع الحالية تضيف `public read` للملف المرفوع حتى يظهر في الموقع العام.
- `update/delete` يبقيان للمستخدم الرافع فقط في هذه المرحلة.
- للإنتاج، الأفضل نقل upload إلى Appwrite Function أو Teams/Permissions أدق حسب المطعم.

## Security Notes

- لا تضع `APPWRITE_API_KEY` في `.env.local`.
- لا تضع `APPWRITE_API_KEY` داخل React أو أي ملف تحت `src`.
- لا ترفع `.env.setup` أو `.env.setup.local` إلى GitHub.
- لا ترسل API Key في الشات.
- لا تعطي العميل صلاحية Appwrite Console في هذه المرحلة.
- سكريبت `setup:appwrite` للإعداد المحلي فقط وليس جزءًا من الواجهة.
- العمليات الحساسة لاحقًا يجب أن تمر عبر Appwrite Functions.
