import { randomBytes } from "node:crypto";
import { Client, ID, Query, TablesDB } from "node-appwrite";

const MAX_TEXT_LENGTH = 500;
const MAX_PEOPLE_COUNT = 100;

const env = (key, fallback = "") => process.env[key]?.trim() || fallback;

const config = {
  endpoint: env("APPWRITE_ENDPOINT", env("APPWRITE_FUNCTION_API_ENDPOINT")),
  projectId: env("APPWRITE_PROJECT_ID", env("APPWRITE_FUNCTION_PROJECT_ID")),
  apiKey: env("APPWRITE_API_KEY"),
  databaseId: env("APPWRITE_DATABASE_ID"),
  restaurantsTableId: env("APPWRITE_RESTAURANTS_TABLE_ID", "restaurants"),
  reservationsTableId: env("APPWRITE_RESERVATIONS_TABLE_ID", "reservations"),
  siteSettingsTableId: env("APPWRITE_SITE_SETTINGS_TABLE_ID", "site_settings"),
  viasocketReservationWebhookUrl: env("VIASOCKET_RESERVATION_WEBHOOK_URL", ""),
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

const createTablesDb = () => {
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  return new TablesDB(client);
};

const generateTrackingCode = () => `RS-${randomBytes(3).toString("hex").toUpperCase()}`;

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

  const restaurant = await tablesDb.getRow({
    databaseId: config.databaseId,
    tableId: config.restaurantsTableId,
    rowId: restaurantId,
  });

  if (restaurant.status !== "active") {
    throw new HttpError(403, "Restaurant is not active.");
  }

  return restaurant;
};

const assertDate = (value) => {
  const reservationDate = cleanText(value, 50);

  if (!reservationDate) {
    throw new HttpError(400, "تاريخ الحجز مطلوب.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
    throw new HttpError(400, "تاريخ الحجز غير صالح.");
  }

  return reservationDate;
};

const assertTime = (value) => {
  const reservationTime = cleanText(value, 50);

  if (!reservationTime) {
    throw new HttpError(400, "وقت الحجز مطلوب.");
  }

  if (!/^\d{2}:\d{2}$/.test(reservationTime)) {
    throw new HttpError(400, "وقت الحجز غير صالح.");
  }

  return reservationTime;
};

const validateReservation = (input) => {
  const customerName = cleanText(input.customerName, 120);
  const customerPhone = cleanText(input.customerPhone, 50);
  const peopleCount = Math.trunc(Number(input.peopleCount));

  if (!customerName) {
    throw new HttpError(400, "اسم العميل مطلوب لإتمام الحجز.");
  }

  if (!customerPhone) {
    throw new HttpError(400, "رقم هاتف العميل مطلوب لإتمام الحجز.");
  }

  if (!Number.isFinite(peopleCount) || peopleCount < 1) {
    throw new HttpError(400, "عدد الأشخاص يجب أن يكون 1 أو أكثر.");
  }

  if (peopleCount > MAX_PEOPLE_COUNT) {
    throw new HttpError(400, `عدد الأشخاص لا يمكن أن يتجاوز ${MAX_PEOPLE_COUNT}.`);
  }

  return {
    customerName,
    customerPhone,
    reservationDate: assertDate(input.reservationDate),
    reservationTime: assertTime(input.reservationTime),
    peopleCount,
    notes: cleanText(input.notes, 1000) || null,
    policyAccepted: Boolean(input.policyAccepted),
  };
};

const getReservationSettings = async (tablesDb, restaurantId) => {
  try {
    const response = await tablesDb.listRows({
      databaseId: config.databaseId,
      tableId: config.siteSettingsTableId,
      queries: [Query.equal("restaurantId", restaurantId), Query.limit(1)],
    });

    return response.rows[0] ?? null;
  } catch {
    return null;
  }
};

const getReservationWorkflow = (settings, reservation) => {
  const requireManualConfirmation = settings?.requireManualReservationConfirmation === true;
  const requireDepositForLargeGroups = settings?.requireDepositForLargeGroups === true;
  const threshold = Number(settings?.depositThresholdPeople);
  const depositAmount = Number(settings?.depositAmount);
  const needsDeposit =
    requireDepositForLargeGroups &&
    Number.isFinite(threshold) &&
    threshold > 0 &&
    reservation.peopleCount >= threshold;

  if (needsDeposit) {
    return {
      status: "deposit_required",
      depositStatus: "required",
      depositAmount: Number.isFinite(depositAmount) && depositAmount > 0 ? depositAmount : null,
    };
  }

  if (requireManualConfirmation) {
    return {
      status: "pending_confirmation",
      depositStatus: "none",
      depositAmount: null,
    };
  }

  return {
    status: "new",
    depositStatus: "none",
    depositAmount: null,
  };
};

const createReservationRow = async (tablesDb, restaurant, reservation, settings) => {
  const createdAtText = new Date().toISOString();
  const trackingCode = generateTrackingCode();
  const workflow = getReservationWorkflow(settings, reservation);

  const row = await tablesDb.createRow({
    databaseId: config.databaseId,
    tableId: config.reservationsTableId,
    rowId: ID.unique(),
    data: {
      restaurantId: restaurant.$id,
      trackingCode,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
      peopleCount: reservation.peopleCount,
      notes: reservation.notes,
      status: workflow.status,
      depositStatus: workflow.depositStatus,
      depositAmount: workflow.depositAmount,
      depositNotes: null,
      confirmationNotes: null,
      policyAccepted: reservation.policyAccepted,
      createdAtText,
    },
  });

  return {
    reservationId: row.$id,
    trackingCode: row.trackingCode ?? trackingCode,
    reservationDate: row.reservationDate,
    reservationTime: row.reservationTime,
    peopleCount: row.peopleCount,
    status: row.status,
    depositStatus: row.depositStatus,
    depositAmount: row.depositAmount,
    source: "website",
  };
};

const json = (res, body, status = 200) => res.json(body, status);

const notifyViaSocket = async (reservationSummary, restaurant) => {
  const webhookUrl = config.viasocketReservationWebhookUrl;

  if (!webhookUrl) {
    // viaSocket is optional; no warning needed
    return;
  }

  try {
    const payload = {
      restaurantId: restaurant.$id,
      reservationId: reservationSummary.reservationId,
      trackingCode: reservationSummary.trackingCode,
      date: reservationSummary.reservationDate,
      time: reservationSummary.reservationTime,
      peopleCount: reservationSummary.peopleCount,
      status: reservationSummary.status,
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
    const reservation = validateReservation(input);
    const settings = await getReservationSettings(tablesDb, restaurant.$id);
    const reservationSummary = await createReservationRow(tablesDb, restaurant, reservation, settings);

    // Notify viaSocket (non-blocking, optional)
    notifyViaSocket(reservationSummary, restaurant);

    log(`Created reservation ${reservationSummary.reservationId} for restaurant ${restaurant.$id}`);

    return json(res, {
      ok: true,
      reservationId: reservationSummary.reservationId,
      trackingCode: reservationSummary.trackingCode,
      reservationDate: reservationSummary.reservationDate,
      reservationTime: reservationSummary.reservationTime,
      peopleCount: reservationSummary.peopleCount,
      status: reservationSummary.status,
      depositStatus: reservationSummary.depositStatus,
      depositAmount: reservationSummary.depositAmount,
      source: reservationSummary.source,
    });
  } catch (caughtError) {
    const status = caughtError instanceof HttpError ? caughtError.status : 500;
    const message = caughtError instanceof Error ? caughtError.message : "تعذر إنشاء الحجز.";

    error(message);

    return json(
      res,
      {
        ok: false,
        message: status >= 500 ? "تعذر إنشاء الحجز. حاول مرة أخرى أو تابع عبر واتساب." : message,
      },
      status,
    );
  }
};

// TODO: After this Function is deployed and verified, remove public create permissions
// from reservations and keep public access limited to Function execution only.
