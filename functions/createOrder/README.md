# createOrder Appwrite Function

Server-side order creation for Pixel One Visuals.

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
APPWRITE_ORDERS_TABLE_ID=orders
APPWRITE_ORDER_ITEMS_TABLE_ID=order_items
APPWRITE_RESTAURANTS_TABLE_ID=restaurants
APPWRITE_DISHES_TABLE_ID=dishes
```

Do not add `APPWRITE_API_KEY` to Vite or any frontend `.env` file.

## Request Body

```json
{
  "restaurantSlug": "demo-restaurant",
  "customerName": "Customer Name",
  "customerPhone": "0612345678",
  "customerAddress": "Address",
  "notes": "Notes",
  "source": "website",
  "items": [
    {
      "dishId": "dish-id",
      "dishName": "Burger",
      "quantity": 2,
      "unitPrice": 45
    }
  ]
}
```

The function resolves the active restaurant server-side from `restaurantSlug`, validates the request, recalculates dish prices for items with `dishId`, creates `orders` and `order_items`, and returns a minimal order summary.

TODO: Recalculate offer/menu item prices server-side from trusted tables before accepting payment or official totals.
