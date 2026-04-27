# Appwrite Functions

## Phase 8A: createOrder

The public checkout should use the `createOrder` Function in production instead of writing directly to `orders` and `order_items` from the browser.

Function source:

`functions/createOrder`

Runtime:

- Node.js 20+
- Entrypoint: `src/main.js`
- Install command: `npm install`

## Function Environment Variables

Set these in the Appwrite Console for the Function only:

```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_ORDERS_TABLE_ID=orders
APPWRITE_ORDER_ITEMS_TABLE_ID=order_items
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
APPWRITE_DISHES_TABLE_ID=dishes
```

Do not put `APPWRITE_API_KEY` in `.env.local`, `.env.example`, Vite variables, or React code.

## Console Setup

1. Open Appwrite Console.
2. Create a new Function named `createOrder`.
3. Select Node.js 20 or newer.
4. Upload or connect the `functions/createOrder` folder.
5. Set the entrypoint to `src/main.js`.
6. Add the environment variables listed above.
7. Allow execution from public visitors only for this Function endpoint, not for database reads.
8. Deploy the Function.
9. Copy the Function ID.
10. Add the ID to frontend `.env.local`:

```env
VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID=
```

No secrets belong in this Vite variable. It is only the public Function ID.

## Test Payload

```json
{
  "restaurantSlug": "demo-restaurant",
  "customerName": "اسم العميل",
  "customerPhone": "0612345678",
  "customerAddress": "العنوان",
  "notes": "ملاحظات",
  "source": "website",
  "items": [
    {
      "dishId": "dish-id",
      "dishName": "برجر",
      "quantity": 2,
      "unitPrice": 45
    }
  ]
}
```

Expected response:

```json
{
  "ok": true,
  "orderId": "...",
  "totalAmount": 90,
  "itemCount": 1,
  "status": "new",
  "source": "website"
}
```

## Fallback Behavior

- If `VITE_APPWRITE_CREATE_ORDER_FUNCTION_ID` is empty, the frontend keeps using the old browser `createOrder` path for staging.
- If the Function fails and `orderMode=both`, the cart is preserved and WhatsApp opens as a fallback.
- If `orderMode=database`, the frontend shows an error and does not auto-open WhatsApp.
- If `orderMode=whatsapp`, the Function is not called.

## Permissions After Verification

After the Function is deployed and tested:

`orders`

- Remove public create.
- Keep read/update for authenticated users only.
- Keep delete disabled or temporary for authenticated admin testing only.

`order_items`

- Remove public create.
- Keep read for authenticated users only.
- Update/delete are usually not needed.

Never enable public read for orders or order items.
