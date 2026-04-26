# Threat Model

## 1. Broken Access Control

الخطر: أن يرى مطعم بيانات مطعم آخر.

العلاج:

- `restaurantId` في كل Row خاص بعميل.
- Appwrite Teams لكل مطعم.
- Appwrite permissions على مستوى Rows.
- Appwrite Functions للعمليات الحساسة.

## 2. Broken Object Level Authorization

الخطر: المستخدم يغير `orderId` أو `restaurantId` من المتصفح.

العلاج:

- لا نثق بأي `restaurantId` قادم من frontend في العمليات الحساسة.
- التحقق داخل Function.
- ربط المستخدم بالـTeam/restaurant داخل Function.

## 3. Data Leakage

الخطر: تسرب أرقام الهاتف، العناوين، الطلبات، أو الحجوزات.

العلاج:

- no public read على `orders` و`reservations`.
- payload محدود في automations.
- عدم إرسال PII لأدوات analytics.

## 4. Secrets Exposure

الخطر: وضع API keys في React أو GitHub.

العلاج:

- لا أسرار داخل frontend.
- أسرار viaSocket وAppwrite Functions في environment آمن داخل Appwrite.
- `.env` و`.env.local` داخل `.gitignore`.

## 5. Webhook Abuse

الخطر: إرسال طلبات مزيفة إلى viaSocket أو Functions.

العلاج:

- webhook secret token أو signature.
- rate limiting لاحقاً.
- validation داخل Function.
- عدم استدعاء viaSocket مباشرة من frontend.

## 6. Analytics Leakage

الخطر: إرسال أسماء، هواتف، عناوين، أو تفاصيل طلبات إلى Google Analytics أو طرف ثالث.

العلاج:

- `VITE_ENABLE_ANALYTICS=false` افتراضياً.
- لا analytics داخل `/admin` أو `/agency`.
- لا إرسال PII أو تفاصيل order/reservation إلى analytics.

## 7. Stored XSS

الخطر: إدخال نصوص ضارة في أسماء الأطباق أو التقييمات أو FAQ.

العلاج:

- عدم استخدام `dangerouslySetInnerHTML`.
- React escaping افتراضياً.
- sanitize لاحقاً في Appwrite Functions عند الإدخال.

## 8. Over-Permissioned Staff

الخطر: موظف يحذف أو يغير كل شيء.

العلاج:

- roles واضحة.
- صلاحيات محدودة.
- audit logs للتعديلات المهمة.
- منع delete الكامل إلا لصلاحيات owner/agency حسب السياسة.

## 9. Data Loss

الخطر: حذف الطلبات أو إعدادات العميل.

العلاج:

- backups شهرية.
- export قبل التعديلات الكبيرة.
- audit logs.
- الاحتفاظ بآخر 3 نسخ.

## 10. Vendor Lock-In

الخطر: الاعتماد الكامل على Appwrite أو viaSocket.

العلاج:

- repositories layer يعزل Appwrite عن الواجهة.
- export JSON/CSV للبيانات.
- viaSocket ليس source of truth.

