# createReservation Appwrite Function

Server-side reservation creation for Pixel One Visuals.

## Runtime

- Runtime: Node.js 20+
- Entrypoint: `src/main.js`
- Install command: `npm install`

## Environment Variables

Set these in the Appwrite Function settings only:

```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_RESERVATIONS_TABLE_ID=reservations
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
```

Do not add `APPWRITE_API_KEY` to Vite or any frontend `.env` file.

## Request Body

```json
{
  "restaurantSlug": "demo-restaurant",
  "customerName": "اسم العميل",
  "customerPhone": "0612345678",
  "reservationDate": "2026-04-27",
  "reservationTime": "20:00",
  "peopleCount": 4,
  "notes": "ملاحظات اختيارية",
  "source": "website"
}
```

The function resolves the active restaurant server-side from `restaurantSlug`, validates the request, creates a `reservations` row, and returns a minimal reservation summary.
