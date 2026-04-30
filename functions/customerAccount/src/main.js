import { Client, Query, TablesDB } from "node-appwrite";

const MAX_ROWS = 50;
const MAX_ITEMS = 100;
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

const getHeader = (req, key) => {
  const lowerKey = key.toLowerCase();
  const headers = req.headers ?? {};

  return headers[key] ?? headers[lowerKey] ?? "";
};

const getAuthenticatedUserId = (req) => cleanText(getHeader(req, "x-appwrite-user-id"), 255);

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

  if (!restaurant) {
    throw new HttpError(404, "Restaurant was not found.");
  }

  if (restaurant.status !== "active") {
    throw new HttpError(403, "Restaurant is not active.");
  }

  return restaurant;
};

const normalizeOrderStatus = (value) => {
  const statuses = ["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled", "rejected"];
  return statuses.includes(value) ? value : "new";
};

const normalizeReservationStatus = (value) => {
  const statuses = [
    "new",
    "pending_confirmation",
    "confirmed",
    "deposit_required",
    "deposit_paid",
    "seated",
    "completed",
    "no_show",
    "cancelled",
    "rejected",
  ];
  return statuses.includes(value) ? value : "new";
};

const normalizeDepositStatus = (value) => {
  const statuses = ["none", "required", "paid", "waived"];
  return statuses.includes(value) ? value : "none";
};

const mapOrder = (row) => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  customerUserId: row.customerUserId ?? undefined,
  customerProfileId: row.customerProfileId ?? undefined,
  trackingCode: row.trackingCode ?? undefined,
  createdAt: row.$createdAt ?? row.createdAtText,
  updatedAt: row.$updatedAt ?? row.createdAtText,
  customerName: row.customerName,
  customerPhone: row.customerPhone,
  customerAddress: row.customerAddress ?? undefined,
  fulfillmentType: row.fulfillmentType === "pickup" ? "pickup" : "delivery",
  deliveryArea: row.deliveryArea ?? undefined,
  deliveryFee: row.deliveryFee ?? undefined,
  deliveryNotes: row.deliveryNotes ?? undefined,
  notes: row.notes ?? undefined,
  totalAmount: Number(row.totalAmount) || 0,
  status: normalizeOrderStatus(row.status),
  source: row.source === "admin" || row.source === "whatsapp" ? row.source : "website",
  isArchived: row.isArchived === true,
  archivedAt: row.archivedAt ?? undefined,
  archiveReason: row.archiveReason ?? undefined,
});

const mapOrderItem = (row) => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  orderId: row.orderId,
  dishId: row.dishId ?? undefined,
  dishName: row.dishName,
  quantity: Number(row.quantity) || 0,
  unitPrice: Number(row.unitPrice) || 0,
  subtotal: Number(row.subtotal) || 0,
});

const mapReservation = (row) => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  customerUserId: row.customerUserId ?? undefined,
  customerProfileId: row.customerProfileId ?? undefined,
  trackingCode: row.trackingCode ?? undefined,
  customerName: row.customerName,
  customerPhone: row.customerPhone,
  reservationDate: row.reservationDate,
  reservationTime: row.reservationTime,
  peopleCount: Number(row.peopleCount) || 0,
  notes: row.notes ?? undefined,
  status: normalizeReservationStatus(row.status),
  depositStatus: normalizeDepositStatus(row.depositStatus),
  depositAmount: row.depositAmount ?? undefined,
  depositNotes: row.depositNotes ?? undefined,
  confirmationNotes: row.confirmationNotes ?? undefined,
  policyAccepted: row.policyAccepted ?? undefined,
  isArchived: row.isArchived === true,
  archivedAt: row.archivedAt ?? undefined,
  archiveReason: row.archiveReason ?? undefined,
  createdAt: row.$createdAt ?? row.createdAtText,
  updatedAt: row.$updatedAt ?? row.createdAtText,
});

const listCustomerOrders = async (tablesDb, restaurantId, userId) => {
  const response = await tablesDb.listRows({
    databaseId: config.databaseId,
    tableId: config.ordersTableId,
    queries: [
      Query.equal("restaurantId", restaurantId),
      Query.equal("customerUserId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(MAX_ROWS),
    ],
  });

  return response.rows.map(mapOrder).filter((order) => !order.isArchived);
};

const listCustomerReservations = async (tablesDb, restaurantId, userId) => {
  const response = await tablesDb.listRows({
    databaseId: config.databaseId,
    tableId: config.reservationsTableId,
    queries: [
      Query.equal("restaurantId", restaurantId),
      Query.equal("customerUserId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(MAX_ROWS),
    ],
  });

  return response.rows.map(mapReservation).filter((reservation) => !reservation.isArchived);
};

const getCustomerOrderItems = async (tablesDb, restaurantId, userId, orderId) => {
  const order = await tablesDb.getRow({
    databaseId: config.databaseId,
    tableId: config.ordersTableId,
    rowId: orderId,
  });

  if (order.restaurantId !== restaurantId || order.customerUserId !== userId) {
    throw new HttpError(404, "Order was not found.");
  }

  const response = await tablesDb.listRows({
    databaseId: config.databaseId,
    tableId: config.orderItemsTableId,
    queries: [
      Query.equal("restaurantId", restaurantId),
      Query.equal("orderId", orderId),
      Query.orderAsc("$createdAt"),
      Query.limit(MAX_ITEMS),
    ],
  });

  return response.rows.map(mapOrderItem);
};

const json = (res, body, status = 200) => res.json(body, status);

export default async ({ req, res, error }) => {
  try {
    assertFunctionConfig();

    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      throw new HttpError(401, "Authentication is required.");
    }

    const input = parseBody(req);
    const action = cleanText(input.action, 40) || "history";
    const restaurantSlug = cleanText(input.restaurantSlug, 120).toLowerCase();

    if (!restaurantSlug) {
      throw new HttpError(400, "restaurantSlug is required.");
    }

    const tablesDb = createTablesDb();
    const restaurant = await getRestaurantBySlug(tablesDb, restaurantSlug);

    if (action === "history") {
      const [orders, reservations] = await Promise.all([
        listCustomerOrders(tablesDb, restaurant.$id, userId),
        listCustomerReservations(tablesDb, restaurant.$id, userId),
      ]);

      return json(res, { ok: true, orders, reservations });
    }

    if (action === "orderItems") {
      const orderId = cleanText(input.orderId, 255);

      if (!orderId) {
        throw new HttpError(400, "orderId is required.");
      }

      const items = await getCustomerOrderItems(tablesDb, restaurant.$id, userId, orderId);
      return json(res, { ok: true, items });
    }

    throw new HttpError(400, "Unsupported customer account action.");
  } catch (caughtError) {
    const status = caughtError instanceof HttpError ? caughtError.status : 500;
    const message = caughtError instanceof Error ? caughtError.message : "Unable to load customer account.";

    error(message);

    return json(
      res,
      {
        ok: false,
        message: status >= 500 ? "تعذر تحميل بيانات حساب العميل حاليا." : message,
      },
      status,
    );
  }
};
