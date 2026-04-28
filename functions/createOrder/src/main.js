import { randomBytes } from "node:crypto";
import { Client, ID, Query, TablesDB } from "node-appwrite";

const MAX_ITEMS = 50;
const MAX_TEXT_LENGTH = 500;

const env = (key, fallback = "") => process.env[key]?.trim() || fallback;

const config = {
  endpoint: env("APPWRITE_ENDPOINT", env("APPWRITE_FUNCTION_API_ENDPOINT")),
  projectId: env("APPWRITE_PROJECT_ID", env("APPWRITE_FUNCTION_PROJECT_ID")),
  apiKey: env("APPWRITE_API_KEY"),
  databaseId: env("APPWRITE_DATABASE_ID"),
  restaurantsTableId: env("APPWRITE_RESTAURANTS_TABLE_ID", "restaurants"),
  dishesTableId: env("APPWRITE_DISHES_TABLE_ID", "dishes"),
  ordersTableId: env("APPWRITE_ORDERS_TABLE_ID", "orders"),
  orderItemsTableId: env("APPWRITE_ORDER_ITEMS_TABLE_ID", "order_items"),
  viasocketOrderWebhookUrl: env("VIASOCKET_ORDER_WEBHOOK_URL", ""),
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const requiredConfigKeys = ["endpoint", "projectId", "apiKey", "databaseId"];

const assertFunctionConfig = () => {
  const missingKeys = requiredConfigKeys.filter((key) => !config[key]);

  if (missingKeys.length > 0) {
    throw new HttpError(500, `Function is missing required environment variables: ${missingKeys.join(", ")}`);
  }
};

const parseBody = (req) => {
  if (req.bodyJson && typeof req.bodyJson === "object") {
    return req.bodyJson;
  }

  const rawBody = req.bodyText ?? req.bodyRaw ?? req.body ?? req.payload ?? "";

  if (typeof rawBody === "object" && rawBody !== null) {
    return rawBody;
  }

  if (!rawBody || typeof rawBody !== "string") {
    throw new HttpError(400, "Request body must be valid JSON.");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
};

const cleanText = (value, maxLength = MAX_TEXT_LENGTH) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
};

const toPositiveNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

const createTablesDb = () => {
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  return new TablesDB(client);
};

const generateTrackingCode = () => `PO-${randomBytes(3).toString("hex").toUpperCase()}`;

const getRestaurant = async (tablesDb, input) => {
  const restaurantSlug = cleanText(input.restaurantSlug, 120);

  if (restaurantSlug) {
    const response = await tablesDb.listRows({
      databaseId: config.databaseId,
      tableId: config.restaurantsTableId,
      queries: [Query.equal("slug", restaurantSlug), Query.limit(1)],
    });

    const restaurant = response.rows[0];

    if (!restaurant) {
      throw new HttpError(404, "Restaurant was not found.");
    }

    if (restaurant.status !== "active") {
      throw new HttpError(403, "Restaurant is not active.");
    }

    return restaurant;
  }

  const restaurantId = cleanText(input.restaurantId, 255);

  if (!restaurantId) {
    throw new HttpError(400, "restaurantSlug is required.");
  }

  let restaurant;

  try {
    restaurant = await tablesDb.getRow({
      databaseId: config.databaseId,
      tableId: config.restaurantsTableId,
      rowId: restaurantId,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && error.code === 404) {
      throw new HttpError(404, "Restaurant was not found.");
    }

    throw error;
  }

  if (restaurant.status !== "active") {
    throw new HttpError(403, "Restaurant is not active.");
  }

  return restaurant;
};

const validateCustomer = (input) => {
  const customerName = cleanText(input.customerName, 120);
  const customerPhone = cleanText(input.customerPhone, 50);

  if (!customerName) {
    throw new HttpError(400, "اسم العميل مطلوب لإتمام الطلب.");
  }

  if (!customerPhone) {
    throw new HttpError(400, "رقم هاتف العميل مطلوب لإتمام الطلب.");
  }

  return {
    customerName,
    customerPhone,
    customerAddress: cleanText(input.customerAddress, 500) || null,
    notes: cleanText(input.notes, 1000) || null,
  };
};

const getDeliveryFee = (input) => {
  const deliveryFee = Number(input.deliveryFee);

  if (!Number.isFinite(deliveryFee) || deliveryFee <= 0) {
    return 0;
  }

  // TODO: Production hardening: load delivery fee from trusted restaurant settings
  // when it becomes part of the server-side schema instead of trusting the client.
  return Math.min(deliveryFee, 10000);
};

const getTrustedDishItem = async (tablesDb, restaurantId, inputItem, quantity) => {
  const dishId = cleanText(inputItem.dishId, 255);

  if (!dishId) {
    return null;
  }

  try {
    const dish = await tablesDb.getRow({
      databaseId: config.databaseId,
      tableId: config.dishesTableId,
      rowId: dishId,
    });

    if (dish.restaurantId !== restaurantId || dish.isAvailable === false) {
      throw new HttpError(400, "أحد عناصر الطلب غير متاح لهذا المطعم.");
    }

    const unitPrice = toPositiveNumber(dish.price);

    if (!unitPrice) {
      throw new HttpError(400, "تعذر التحقق من سعر أحد عناصر الطلب.");
    }

    return {
      dishId,
      dishName: cleanText(dish.name, 255) || cleanText(inputItem.dishName, 255),
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, "تعذر التحقق من أحد أطباق الطلب.");
  }
};

const normalizeItems = async (tablesDb, restaurantId, inputItems) => {
  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    throw new HttpError(400, "لا يمكن إنشاء طلب بدون منتجات.");
  }

  if (inputItems.length > MAX_ITEMS) {
    throw new HttpError(400, `لا يمكن إنشاء طلب يحتوي على أكثر من ${MAX_ITEMS} عنصرًا.`);
  }

  const normalizedItems = [];

  for (const item of inputItems) {
    const quantity = Math.trunc(toPositiveNumber(item?.quantity) ?? 0);

    if (!quantity) {
      throw new HttpError(400, "كمية المنتج يجب أن تكون أكبر من صفر.");
    }

    const trustedDishItem = await getTrustedDishItem(tablesDb, restaurantId, item, quantity);

    if (trustedDishItem) {
      normalizedItems.push(trustedDishItem);
      continue;
    }

    const dishName = cleanText(item?.dishName, 255);
    const unitPrice = toPositiveNumber(item?.unitPrice);

    if (!dishName) {
      throw new HttpError(400, "اسم المنتج مطلوب داخل عناصر الطلب.");
    }

    if (!unitPrice) {
      throw new HttpError(400, "سعر المنتج غير صالح.");
    }

    // TODO: Production hardening: recalculate offer/menu prices server-side
    // from trusted dishes/offers/menu tables before accepting payment or official totals.
    normalizedItems.push({
      dishId: null,
      dishName,
      quantity,
      unitPrice,
      subtotal: unitPrice * quantity,
    });
  }

  return normalizedItems;
};

const createOrderRows = async (tablesDb, restaurant, customer, items, deliveryFee) => {
  const totalAmount = items.reduce((total, item) => total + item.subtotal, 0) + deliveryFee;
  const createdAtText = new Date().toISOString();
  const trackingCode = generateTrackingCode();

  const order = await tablesDb.createRow({
    databaseId: config.databaseId,
    tableId: config.ordersTableId,
    rowId: ID.unique(),
    data: {
      restaurantId: restaurant.$id,
      trackingCode,
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      customerAddress: customer.customerAddress,
      notes: customer.notes,
      totalAmount,
      status: "new",
      source: "website",
      createdAtText,
    },
  });

  const orderItems = await Promise.all(
    items.map((item) =>
      tablesDb.createRow({
        databaseId: config.databaseId,
        tableId: config.orderItemsTableId,
        rowId: ID.unique(),
        data: {
          restaurantId: restaurant.$id,
          orderId: order.$id,
          dishId: item.dishId,
          dishName: item.dishName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        },
      }),
    ),
  );

  return {
    orderId: order.$id,
    trackingCode: order.trackingCode ?? trackingCode,
    totalAmount,
    itemCount: orderItems.length,
    status: order.status,
    source: order.source,
  };
};

const json = (res, body, status = 200) => res.json(body, status);

const notifyViaSocket = async (orderSummary, restaurant) => {
  const webhookUrl = config.viasocketOrderWebhookUrl;

  if (!webhookUrl) {
    // viaSocket is optional; no warning needed
    return;
  }

  try {
    const payload = {
      restaurantId: restaurant.$id,
      orderId: orderSummary.orderId,
      trackingCode: orderSummary.trackingCode,
      totalAmount: orderSummary.totalAmount,
      status: orderSummary.status,
      createdAt: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`viaSocket webhook failed with status ${response.status}`);
    }
  } catch (error) {
    console.warn(`viaSocket webhook error: ${error.message}`);
  }
};

export default async ({ req, res, log, error }) => {
  try {
    assertFunctionConfig();

    const input = parseBody(req);
    const tablesDb = createTablesDb();
    const restaurant = await getRestaurant(tablesDb, input);
    const customer = validateCustomer(input);
    const items = await normalizeItems(tablesDb, restaurant.$id, input.items);
    const deliveryFee = getDeliveryFee(input);
    const orderSummary = await createOrderRows(tablesDb, restaurant, customer, items, deliveryFee);

    // Notify viaSocket (non-blocking, optional)
    void notifyViaSocket(orderSummary, restaurant);

    log(`Created order ${orderSummary.orderId} for restaurant ${restaurant.$id}`);

    return json(res, {
      ok: true,
      orderId: orderSummary.orderId,
      trackingCode: orderSummary.trackingCode,
      totalAmount: orderSummary.totalAmount,
      itemCount: orderSummary.itemCount,
      status: orderSummary.status,
      source: orderSummary.source,
    });
  } catch (caughtError) {
    const status = caughtError instanceof HttpError ? caughtError.status : 500;
    const message = caughtError instanceof Error ? caughtError.message : "تعذر إنشاء الطلب.";

    error(message);

    return json(
      res,
      {
        ok: false,
        message: status >= 500 ? "تعذر إنشاء الطلب. حاول مرة أخرى أو تابع عبر واتساب." : message,
      },
      status,
    );
  }
};
