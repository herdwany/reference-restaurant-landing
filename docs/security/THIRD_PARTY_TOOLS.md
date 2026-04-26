# Third-Party Tools Policy

## Appwrite

- Source of truth للبيانات.
- مسؤول عن Auth, Database, Storage, Functions.
- العميل لا يدخل Appwrite Console.
- لا تستخدم Server SDK داخل frontend.

## viaSocket

- Automations فقط.
- ليس قاعدة البيانات الرئيسية.
- لا يستقبل كلمات مرور.
- لا يستقبل API keys.
- لا يستقبل بيانات زائدة عن الحاجة.
- يفضل إرسال `orderId` وملخص محدود فقط.
- أي webhook يجب أن يمر عبر Appwrite Function وليس من frontend.

الاستخدامات اللاحقة المتوقعة:

- إشعار طلب جديد.
- إرسال ملخص حجز.
- تحديث Google Sheets كتقرير.
- إرسال إشعارات داخلية للوكالة أو صاحب المطعم.

## Google Analytics

- اختياري.
- معطل افتراضياً عبر `VITE_ENABLE_ANALYTICS=false`.
- لا يعمل داخل `/admin` أو `/agency`.
- لا يرسل أسماء، هواتف، عناوين، أو تفاصيل طلبات.

## Google Search Console

- مسموح لأنه لتحسين الظهور في البحث.
- لا يحتاج بيانات الطلبات أو الحجوزات.

## Google Tag Manager

- ممنوع افتراضياً.
- لا يفعّل إلا إذا كانت هناك حاجة واضحة.
- لا يسمح للعميل بإضافة scripts عشوائية.
- أي tag يجب أن يراجع أمنياً قبل النشر.

## Google Sheets

- يمكن استعماله عبر viaSocket كنسخة تقريرية فقط.
- لا يكون source of truth.
- لا يحتوي بيانات حساسة إلا إذا وافق العميل وتم توضيح ذلك في الاتفاق.

