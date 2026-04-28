# Appwrite Schema

هذا المشروع يستخدم `appwrite@24`، لذلك نعتمد تسمية Appwrite الحديثة:

- Tables
- Rows
- `TablesDB.listRows`

عند قراءة كلمة collections في خطة المنتج، فهي تقابل Tables في Appwrite الحديث. لا نستخدم `collections/documents` داخل الكود لأن `Databases.listDocuments` deprecated في النسخة المثبتة.

كل Table خاص بعميل يجب أن يحتوي `restaurantId` ما عدا `restaurants` وحقول عامة مثل `profiles` عندما يكون المستخدم agency-level.

## restaurants

- `name`: string
- `slug`: string unique
- `businessType`: enum/string `restaurant | cafe | bakery | cloud_kitchen | salon | clinic | gym | car_rental | other`
- `status`: enum `draft | active | suspended | cancelled`
- `plan`: enum/string `starter | pro | premium | managed`, optional/default `starter`
- `billingStatus`: enum/string `trial | active | overdue | cancelled`, optional/default `trial`
- `subscriptionEndsAt`: datetime optional
- `trialEndsAt`: datetime optional
- `supportLevel`: enum/string `basic | standard | priority | managed`, optional/default `basic`
- `teamId`: string
- `ownerUserId`: string
- `nameAr`: string
- `tagline`: string
- `description`: text
- `logoFileId`: string optional
- `heroImageFileId`: string optional
- `heroImageUrl`: url optional
- `primaryColor`: string
- `secondaryColor`: string
- `accentColor`: string
- `successColor`: string
- `phone`: string
- `whatsappNumber`: string
- `email`: email optional
- `address`: string
- `mapsUrl`: url optional
- `mapImageUrl`: url optional
- `workingHours`: string
- `domain`: string optional
- `createdAt`: datetime
- `updatedAt`: datetime

ملاحظة Phase 9D: لم تتم إضافة عمود `features` مخصص في TablesDB. الـ Feature Flags الحالية مشتقة من `plan` داخل التطبيق، ويمكن إضافة overrides لاحقًا عبر Function/Schema مستقلة إذا احتجنا تخصيصًا لكل عميل.

## profiles

- `userId`: string
- `restaurantId`: string optional
- `teamId`: string optional
- `role`: enum `agency_admin | owner | staff`
- `fullName`: string
- `email`: email
- `phone`: string optional
- `isActive`: boolean
- `createdAt`: datetime

## dishes

- `restaurantId`: string
- `name`: string
- `description`: text
- `price`: float
- `oldPrice`: float optional
- `imageFileId`: string optional
- `imageUrl`: url optional
- `badge`: string optional
- `category`: string
- `rating`: float
- `isPopular`: boolean
- `isAvailable`: boolean
- `ingredients`: string array, أو text JSON إذا كانت إعدادات Appwrite لديك لا تدعم array بالشكل المطلوب
- `sortOrder`: integer
- `createdAt`: datetime
- `updatedAt`: datetime

## offers

- `restaurantId`: string
- `title`: string
- `description`: text
- `price`: float
- `oldPrice`: float optional
- `imageFileId`: string optional
- `imageUrl`: url optional
- `colorTheme`: enum `orange | red | gold`
- `ctaText`: string
- `isActive`: boolean
- `startsAt`: datetime optional
- `endsAt`: datetime optional
- `sortOrder`: integer
- `createdAt`: datetime
- `updatedAt`: datetime

## gallery_items

- `restaurantId`: string
- `title`: string
- `alt`: string
- `imageFileId`: string optional
- `imageUrl`: url optional
- `isVisible`: boolean
- `sortOrder`: integer optional

## testimonials

- `restaurantId`: string
- `name`: string
- `text`: text
- `rating`: integer
- `avatarFileId`: string optional
- `avatarUrl`: url optional
- `role`: string optional
- `isVisible`: boolean
- `sortOrder`: integer

## faqs

- `restaurantId`: string
- `question`: string
- `answer`: text
- `isVisible`: boolean
- `sortOrder`: integer

## site_settings

- `restaurantId`: string
- `currency`: string
- `language`: string
- `direction`: string, غالباً `rtl`
- `orderMode`: enum `whatsapp | database | both`
- `reservationMode`: enum `whatsapp | database | both`
- `showHero`: boolean
- `showTrustBadges`: boolean
- `showFeaturedDishes`: boolean
- `showOffers`: boolean
- `showGallery`: boolean
- `showTestimonials`: boolean
- `showActionGrid`: boolean
- `showFaq`: boolean
- `showFooter`: boolean

## orders

- `restaurantId`: string
- `customerName`: string
- `customerPhone`: string
- `customerAddress`: string optional
- `notes`: text optional
- `totalAmount`: float
- `status`: enum `new | confirmed | preparing | ready | delivered | cancelled`
- `source`: enum `website | whatsapp | admin`
- `createdAtText`: string optional
- `createdAt`: datetime
- `updatedAt`: datetime

## order_items

- `restaurantId`: string
- `orderId`: string
- `dishId`: string optional
- `dishName`: string
- `quantity`: integer
- `unitPrice`: float
- `subtotal`: float

## reservations

- `restaurantId`: string
- `customerName`: string
- `customerPhone`: string
- `reservationDate`: datetime أو string حسب إعدادات Appwrite
- `reservationTime`: string
- `peopleCount`: integer
- `notes`: text optional
- `status`: enum `new | confirmed | cancelled | completed`
- `createdAtText`: string optional
- `createdAt`: datetime
- `updatedAt`: datetime

## audit_logs

- `restaurantId`: string optional
- `userId`: string optional
- `action`: string
- `entityType`: string
- `entityId`: string optional
- `metadata`: text JSON optional
- `createdAt`: datetime

## Suggested Indexes

Appwrite يحتاج indexes للحقول التي يتم استخدامها في `Query.equal`, `Query.orderAsc`, وعمليات الفرز أو التصفية المتكررة.

### restaurants

- unique `slug`
- `status`
- `ownerUserId`

### dishes

- `restaurantId`
- `restaurantId + isAvailable`
- `restaurantId + category`
- `restaurantId + sortOrder`

### offers

- `restaurantId`
- `restaurantId + isActive`
- `restaurantId + startsAt + endsAt`
- `restaurantId + sortOrder`

### orders

- `restaurantId`
- `restaurantId + status`
- `restaurantId + createdAt`

### reservations

- `restaurantId`
- `restaurantId + status`
- `restaurantId + reservationDate`

### faqs / gallery_items / testimonials

- `restaurantId + isVisible`
- `restaurantId + sortOrder`
