import { Client, Query, TablesDB } from "node-appwrite";

const MAX_TEXT_LENGTH = 500;

const env = (key, fallback = "") => process.env[key]?.trim() || fallback;

const config = {
  endpoint: env("APPWRITE_ENDPOINT", env("APPWRITE_FUNCTION_API_ENDPOINT")),
  projectId: env("APPWRITE_PROJECT_ID", env("APPWRITE_FUNCTION_PROJECT_ID")),
  apiKey: env("APPWRITE_API_KEY"),
  databaseId: env("APPWRITE_DATABASE_ID"),
  restaurantsTableId: env("APPWRITE_RESTAURANTS_TABLE_ID", "restaurants"),
  ordersTableId: env("APPWRITE_ORDERS_TABLE_ID", "orders"),
  orderItemsTableId: env("APPWRITE_ORDER_ITEMS_TABLE_ID", "order_items"),
  reservationsTableId: env("APPWRITE_RESERVATIONS_TABLE_ID", "reservations"),
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

const normalizePhone = (value) => cleanText(value, 80).replace(/[^\d]/g, "");

const createTablesDb = () => {
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  return new TablesDB(client);
};

const getRestaurantBySlug = async (tablesDb, restaurantSlug) => {
  const response = await tablesDb.listRows({
    databaseId: config.databaseId,
    tableId: config.restaurantsTableId,
    queries: [Query.equal("slug", restaurantSlug), Query.limit(1)],
  });

  const restaurant = response.rows[0];

  if (!restaurant || restaurant.status !== "active") {
    return null;
  }

  return restaurant;
};

const findOrder = async (tablesDb, restaurantId, phone, trackingCode) => {
  const response = await tablesDb.listRows({
    databaseId: config.databaseId,
    tableId: config.ordersTableId,
    queries: [Query.equal("restaurantId", restaurantId), Query.equal("trackingCode", trackingCode), Query.limit(5)],
  });

  const order = response.rows.find((row) => normalizePhone(row.customerPhone) === phone);

  if (!order) {
    return null;
  }

  let itemCount = 0;

  try {
    const itemsResponse = await tablesDb.listRows({
      databaseId: config.databaseId,
      tableId: config.orderItemsTableId,
      queries: [Query.equal("restaurantId", restaurantId), Query.equal("orderId", order.$id), Query.limit(20)],
    });

    itemCount = itemsResponse.rows.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
  } catch {
    itemCount = 0;
  }

  return {
    type: "order",
    trackingCode: order.trackingCode,
    status: order.status,
    createdAt: order.$createdAt ?? order.createdAtText ?? null,
    totalAmount: order.totalAmount ?? null,
    itemCount,
  };
};

const findReservation = async (tablesDb, restaurantId, phone, trackingCode) => {
  const response = await tablesDb.listRows({
    databaseId: config.databaseId,
    tableId: config.reservationsTableId,
    queries: [Query.equal("restaurantId", restaurantId), Query.equal("trackingCode", trackingCode), Query.limit(5)],
  });

  const reservation = response.rows.find((row) => normalizePhone(row.customerPhone) === phone);

  if (!reservation) {
    return null;
  }

  return {
    type: "reservation",
    trackingCode: reservation.trackingCode,
    status: reservation.status,
    createdAt: reservation.$createdAt ?? reservation.createdAtText ?? null,
    reservationDate: reservation.reservationDate,
    reservationTime: reservation.reservationTime,
    peopleCount: reservation.peopleCount,
    depositStatus: reservation.depositStatus ?? "none",
    depositAmount: reservation.depositAmount ?? null,
  };
};

const json = (res, body, status = 200) => res.json(body, status);

export default async ({ req, res, error }) => {
  try {
    assertFunctionConfig();

    const input = parseBody(req);
    const restaurantSlug = cleanText(input.restaurantSlug, 120).toLowerCase();
    const trackingCode = cleanText(input.trackingCode, 80).toUpperCase();
    const phone = normalizePhone(input.phone);
    const type = cleanText(input.type, 40);

    if (!restaurantSlug || !trackingCode || !phone) {
      throw new HttpError(400, "restaurantSlug, trackingCode, and phone are required.");
    }

    const tablesDb = createTablesDb();
    const restaurant = await getRestaurantBySlug(tablesDb, restaurantSlug);

    if (!restaurant) {
      return json(res, { ok: true, found: false });
    }

    const checks =
      type === "order"
        ? [findOrder]
        : type === "reservation"
          ? [findReservation]
          : [findOrder, findReservation];

    for (const findRequest of checks) {
      const result = await findRequest(tablesDb, restaurant.$id, phone, trackingCode);

      if (result) {
        return json(res, {
          ok: true,
          found: true,
          restaurant: {
            name: restaurant.nameAr || restaurant.name,
            whatsappNumber: restaurant.whatsappNumber || "",
          },
          result,
        });
      }
    }

    return json(res, { ok: true, found: false });
  } catch (caughtError) {
    const status = caughtError instanceof HttpError ? caughtError.status : 500;
    const message = caughtError instanceof Error ? caughtError.message : "Unable to track request.";

    error(message);

    return json(
      res,
      {
        ok: false,
        message: status >= 500 ? "تعذر تتبع الطلب أو الحجز حاليًا." : message,
      },
      status,
    );
  }
};
