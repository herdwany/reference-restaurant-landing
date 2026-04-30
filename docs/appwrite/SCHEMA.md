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
- `businessType`: enum/string `restaurant | cafe | bakery | cloud_kitchen` for new clients. Older non-food values are legacy only and should not be used for current sales.
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
- `faviconFileId`: string optional, Appwrite Storage file used for the browser tab icon
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
- `domainType`: enum/string `pixelone_path | subdomain | custom_domain`, optional/default `pixelone_path`
- `subdomain`: string optional
- `customDomain`: string optional
- `domainStatus`: enum/string `not_configured | pending_dns | pending_verification | active | failed`, optional/default `not_configured`
- `domainNotes`: text optional
- `domainVerifiedAt`: datetime optional
- `dnsTarget`: string optional
- `createdAt`: datetime
- `updatedAt`: datetime

ملاحظة Phase 9D: لم تتم إضافة عمود `features` مخصص في TablesDB. الـ Feature Flags الحالية مشتقة من `plan` داخل التطبيق، ويمكن إضافة overrides لاحقًا عبر Function/Schema مستقلة إذا احتجنا تخصيصًا لكل عميل.

Phase 9F adds domain metadata only. `/r/:slug` remains the active public routing path until subdomain/custom domain resolver work is planned and deployed. TODO: add safe unique indexes on `subdomain` and `customDomain` after production migration rules are confirmed.

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

## customer_profiles

- `restaurantId`: string
- `userId`: string
- `fullName`: string
- `phone`: string optional. OAuth providers may not return a phone number; customers can add it later from `بياناتي`.
- `email`: email optional
- `defaultAddress`: string optional
- `city`: string optional
- `deliveryNotes`: text optional
- `isActive`: boolean
- Email verification is read from Appwrite Auth `user.emailVerification`; no extra profile role is created for public registration.

## dishes

- `restaurantId`: string
- `name`: string
- `description`: text
- `translations`: text JSON optional. Example: `{ "fr": { "name": "...", "description": "..." }, "en": { "name": "...", "description": "..." } }`
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
- `translations`: text JSON optional. Example: `{ "fr": { "title": "...", "description": "...", "ctaText": "..." } }`
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
- `translations`: text JSON optional. Example: `{ "fr": { "question": "...", "answer": "..." } }`
- `isVisible`: boolean
- `sortOrder`: integer

## site_settings

- `restaurantId`: string
- `currency`: string
- `language`: string
- `direction`: string, غالباً `rtl`
- `orderMode`: enum `whatsapp | database | both`
- `reservationMode`: enum `whatsapp | database | both`
- `heroTitle`: text optional
- `heroSubtitle`: text optional
- `primaryCtaText`: string optional
- `secondaryCtaText`: string optional
- `heroMediaType`: enum `image | video_url`, optional default `image`
- `heroImageUrl`: string optional
- `heroVideoUrl`: string optional
- `heroLayout`: enum `split | background | centered`, optional default `split`
- `themePreset`: enum `classic_red | black_gold | coffee | fresh | minimal`, optional default `classic_red`
- `fontPreset`: enum `modern | classic | elegant | friendly`, optional default `modern`
- `cardStyle`: enum `soft | bordered | flat | premium`, optional default `soft`
- `buttonStyle`: enum `rounded | soft | sharp | premium`, optional default `rounded`
- `headerStyle`: enum `clean | centered | glass | solid`, optional default `clean`
- `footerStyle`: enum `dark | light | brand | minimal`, optional default `dark`
- `sectionSpacing`: enum `compact | normal | wide`, optional default `normal`
- `backgroundStyle`: enum `warm | clean | pattern | solid | premium`, optional default `warm`
- `featuredSectionTitle`: string optional
- `offersSectionTitle`: string optional
- `gallerySectionTitle`: string optional
- `testimonialsSectionTitle`: string optional
- `contactSectionTitle`: string optional
- `faqSectionTitle`: string optional
- `translations`: text JSON optional for homepage copy and policy text. Base Arabic/current copy stays in the existing columns.
- `requireManualReservationConfirmation`: boolean optional
- `requireDepositForLargeGroups`: boolean optional
- `depositThresholdPeople`: integer optional
- `depositAmount`: float optional
- `depositPolicyText`: text optional
- `cancellationPolicyText`: text optional
- `maxPeoplePerReservation`: integer optional
- `hideCompletedOrdersFromMainList`: boolean optional default `true`
- `hideCancelledOrdersFromMainList`: boolean optional default `true`
- `showPastReservationsInSeparateTab`: boolean optional default `true`
- `enableManualArchiveActions`: boolean optional default `true`
- `autoArchiveCompletedOrders`: boolean optional default `false` (deferred; requires a later Scheduled Function)
- `orderAutoArchiveAfterHours`: integer optional
- `autoArchiveCompletedReservations`: boolean optional default `false` (deferred; requires a later Scheduled Function)
- `reservationAutoArchiveAfterHours`: integer optional
- `showHero`: boolean
- `showTrustBadges`: boolean
- `showFeatured`: boolean optional, mirrors featured dishes visibility for new homepage customization UI
- `showFeaturedDishes`: boolean
- `showOffers`: boolean
- `showGallery`: boolean
- `showTestimonials`: boolean
- `showContact`: boolean optional, mirrors booking/contact visibility for new homepage customization UI
- `showActionGrid`: boolean
- `showFaq`: boolean
- `showFooter`: boolean

## orders

- `restaurantId`: string
- `trackingCode`: string optional, generated for customer tracking without login
- `customerName`: string
- `customerPhone`: string
- `customerAddress`: string optional
- `notes`: text optional
- `totalAmount`: float
- `status`: enum `new | confirmed | preparing | ready | out_for_delivery | completed | cancelled | rejected`
- `source`: enum `website | whatsapp | admin`
- `isArchived`: boolean optional default `false`
- `archivedAt`: datetime optional
- `archiveReason`: string/text optional
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
- `trackingCode`: string optional, generated for customer tracking without login
- `customerName`: string
- `customerPhone`: string
- `reservationDate`: datetime أو string حسب إعدادات Appwrite
- `reservationTime`: string
- `peopleCount`: integer
- `notes`: text optional
- `status`: enum `new | pending_confirmation | confirmed | deposit_required | deposit_paid | seated | completed | no_show | cancelled | rejected`
- `depositStatus`: enum/string `none | required | paid | waived`, optional
- `depositAmount`: float optional
- `depositNotes`: text optional
- `confirmationNotes`: text optional
- `policyAccepted`: boolean optional
- `isArchived`: boolean optional default `false`
- `archivedAt`: datetime optional
- `archiveReason`: string/text optional
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
- `createdAtText`: string optional
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
- `restaurantId + isArchived`
- `restaurantId + createdAt`
- `trackingCode`
- `restaurantId + trackingCode`

### reservations

- `restaurantId`
- `restaurantId + status`
- `restaurantId + isArchived`
- `restaurantId + reservationDate`
- `trackingCode`
- `restaurantId + trackingCode`

### faqs / gallery_items / testimonials

- `restaurantId + isVisible`
- `restaurantId + sortOrder`
