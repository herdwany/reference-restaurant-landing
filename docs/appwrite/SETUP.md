# Appwrite Setup

## خطوات الإعداد بالعربية

1. أنشئ مشروعاً جديداً في `cloud.appwrite.io`.
2. أضف Web platform:
   - `localhost` للتطوير.
   - الدومين الحقيقي عند النشر.
3. انسخ `Project ID`.
4. أنشئ Database جديداً.
5. أنشئ Tables المذكورة في `SCHEMA.md`.
6. أنشئ Bucket باسم `restaurant-assets`.
7. انسخ `.env.example` إلى `.env.local` محلياً.
8. ضع القيم العامة فقط:

```bash
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_database_id
VITE_APPWRITE_BUCKET_ID=restaurant_assets_bucket_id
VITE_APPWRITE_DEFAULT_RESTAURANT_SLUG=demo-restaurant
VITE_ENABLE_ANALYTICS=false
```

لا تضع أي API Key أو viaSocket secret أو Server secret في ملفات `VITE_`.

9. شغّل:

```bash
npm run dev
```

10. اختبر الموقع بدون `.env.local`. يجب أن يعمل من `restaurantConfig.ts`.
11. اختبر الموقع مع `.env.local` ناقص أو غير مضبوط. يجب ألا ينهار، ويعود إلى fallback.

## Short English Setup

1. Create an Appwrite Cloud project.
2. Add a Web platform for `localhost` and your production domain.
3. Copy the Project ID.
4. Create a Database.
5. Create the Tables from `SCHEMA.md`.
6. Create a `restaurant-assets` bucket.
7. Copy `.env.example` to `.env.local`.
8. Run `npm run dev`.
9. Verify the app still works without Appwrite configured.

## Storage Bucket

Bucket name suggestion:

```text
restaurant-assets
```

الاستخدام:

- logos
- hero images
- dish images
- offer images
- gallery images
- avatars

الصلاحيات المقترحة:

- public read للصور المنشورة فقط.
- write/update/delete للـ `owner`, `staff`, و`agency_admin`.
- لا تسمح للزائر العام برفع الصور.

لا يوجد upload في هذه المرحلة. سيتم تنفيذه لاحقاً من لوحة التحكم أو Appwrite Function.
