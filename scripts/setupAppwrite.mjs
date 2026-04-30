#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import {
  AppwriteException,
  Client,
  Databases,
  ID,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
  TablesDBIndexType,
} from "node-appwrite";

const setupEnvPath = resolve(process.cwd(), ".env.setup");

if (existsSync(setupEnvPath)) {
  dotenv.config({ path: setupEnvPath, quiet: true });
} else {
  console.warn("[skipped] .env.setup not found. Reading process.env only.");
}

const requiredEnv = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
  "APPWRITE_BUCKET_ID",
  "APPWRITE_DEFAULT_RESTAURANT_SLUG",
];

const missingEnv = requiredEnv.filter((key) => {
  const value = process.env[key]?.trim();
  return !value || value.includes("<") || value.includes(">");
});

if (missingEnv.length > 0) {
  console.error(`[error] Missing setup environment values: ${missingEnv.join(", ")}`);
  console.error("[error] Copy .env.setup.example to .env.setup and fill it with local setup credentials.");
  process.exit(1);
}

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT.trim(),
  projectId: process.env.APPWRITE_PROJECT_ID.trim(),
  apiKey: process.env.APPWRITE_API_KEY.trim(),
  databaseId: process.env.APPWRITE_DATABASE_ID.trim(),
  bucketId: process.env.APPWRITE_BUCKET_ID.trim(),
  defaultRestaurantSlug: process.env.APPWRITE_DEFAULT_RESTAURANT_SLUG.trim(),
};

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const log = (status, message) => {
  console.log(`[${status}] ${message}`);
};

const getErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const isAppwriteError = (error) => error instanceof AppwriteException || typeof error?.code === "number";
const isNotFoundError = (error) => isAppwriteError(error) && error.code === 404;
const isConflictError = (error) =>
  isAppwriteError(error) &&
  (error.code === 409 || String(error.type ?? "").includes("already_exists"));

const isReadyStatus = (resource) => {
  const status = resource?.status;
  return !status || status === "available";
};

const varchar = (key, size, required = false, xdefault) => ({ key, kind: "varchar", size, required, xdefault });
const text = (key, required = false) => ({ key, kind: "text", required });
const email = (key, required = false) => ({ key, kind: "email", required });
const bool = (key, required = false, xdefault) => ({ key, kind: "boolean", required, xdefault });
const float = (key, required = false) => ({ key, kind: "float", required });
const integer = (key, required = false) => ({ key, kind: "integer", required });
const datetime = (key, required = false) => ({ key, kind: "datetime", required });

const index = (key, type, columns) => ({ key, type, columns });
const keyIndex = (key, columns) => index(key, TablesDBIndexType.Key, columns);
const uniqueIndex = (key, columns) => index(key, TablesDBIndexType.Unique, columns);

const tables = [
  {
    id: "restaurants",
    name: "Restaurants",
    columns: [
      varchar("slug", 120, true),
      varchar("name", 255, true),
      varchar("nameAr", 255, true),
      varchar("status", 50, true),
      varchar("plan", 50, false, "starter"),
      varchar("billingStatus", 50, false, "trial"),
      datetime("subscriptionEndsAt"),
      datetime("trialEndsAt"),
      varchar("supportLevel", 50, false, "basic"),
      varchar("teamId", 255),
      varchar("ownerUserId", 255),
      varchar("businessType", 80, true),
      varchar("tagline", 255),
      text("description"),
      varchar("logoFileId", 255),
      varchar("faviconFileId", 255),
      varchar("heroImageFileId", 255),
      varchar("heroImageUrl", 1000),
      varchar("primaryColor", 32),
      varchar("secondaryColor", 32),
      varchar("accentColor", 32),
      varchar("successColor", 32),
      varchar("phone", 50),
      varchar("whatsappNumber", 50),
      email("email"),
      varchar("address", 500),
      varchar("mapsUrl", 1000),
      varchar("mapImageUrl", 1000),
      varchar("workingHours", 255),
      varchar("domain", 255),
      varchar("domainType", 50, false, "pixelone_path"),
      varchar("subdomain", 120),
      varchar("customDomain", 255),
      varchar("domainStatus", 50, false, "not_configured"),
      text("domainNotes"),
      datetime("domainVerifiedAt"),
      varchar("dnsTarget", 255),
    ],
    indexes: [
      uniqueIndex("restaurants_slug_unique", ["slug"]),
      keyIndex("restaurants_status_idx", ["status"]),
    ],
  },
  {
    id: "profiles",
    name: "Profiles",
    columns: [
      varchar("userId", 255, true),
      varchar("restaurantId", 255),
      varchar("teamId", 255),
      varchar("role", 50, true),
      varchar("fullName", 255, true),
      email("email", true),
      varchar("phone", 50),
      bool("isActive", true),
    ],
    indexes: [
      keyIndex("profiles_userId_idx", ["userId"]),
      keyIndex("profiles_restaurantId_idx", ["restaurantId"]),
      keyIndex("profiles_role_idx", ["role"]),
    ],
  },
  {
    id: "customer_profiles",
    name: "Customer Profiles",
    permissions: [Permission.create(Role.users())],
    columns: [
      varchar("restaurantId", 255, true),
      varchar("userId", 255, true),
      varchar("fullName", 255, true),
      varchar("phone", 50, true),
      email("email"),
      varchar("defaultAddress", 500),
      varchar("city", 120),
      text("deliveryNotes"),
      bool("isActive", true),
    ],
    indexes: [
      keyIndex("customer_profiles_restaurantId", ["restaurantId"]),
      keyIndex("customer_profiles_userId", ["userId"]),
      uniqueIndex("customer_profiles_rest_user", ["restaurantId", "userId"]),
    ],
  },
  {
    id: "dishes",
    name: "Dishes",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("name", 255, true),
      text("description"),
      text("translations"),
      float("price", true),
      float("oldPrice"),
      varchar("imageFileId", 255),
      varchar("imageUrl", 1000),
      varchar("badge", 120),
      varchar("category", 120, true),
      float("rating"),
      bool("isPopular", false, false),
      bool("isAvailable", true),
      text("ingredients"),
      integer("sortOrder"),
    ],
    indexes: [
      keyIndex("dishes_restaurantId_idx", ["restaurantId"]),
      keyIndex("dishes_restaurant_available", ["restaurantId", "isAvailable"]),
      keyIndex("dishes_restaurant_category", ["restaurantId", "category"]),
      keyIndex("dishes_restaurant_sortOrder", ["restaurantId", "sortOrder"]),
    ],
  },
  {
    id: "offers",
    name: "Offers",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("title", 255, true),
      text("description"),
      text("translations"),
      float("price", true),
      float("oldPrice"),
      varchar("imageFileId", 255),
      varchar("imageUrl", 1000),
      varchar("colorTheme", 50, true),
      varchar("ctaText", 120, true),
      bool("isActive", true),
      datetime("startsAt"),
      datetime("endsAt"),
      integer("sortOrder"),
    ],
    indexes: [
      keyIndex("offers_restaurantId_idx", ["restaurantId"]),
      keyIndex("offers_restaurant_active", ["restaurantId", "isActive"]),
    ],
  },
  {
    id: "gallery_items",
    name: "Gallery Items",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("title", 255, true),
      varchar("alt", 255, true),
      varchar("imageFileId", 255),
      varchar("imageUrl", 1000),
      bool("isVisible", true),
      integer("sortOrder"),
    ],
    indexes: [
      keyIndex("gallery_restaurantId_idx", ["restaurantId"]),
      keyIndex("gallery_restaurant_visible", ["restaurantId", "isVisible"]),
      keyIndex("gallery_restaurant_sortOrder", ["restaurantId", "sortOrder"]),
    ],
  },
  {
    id: "testimonials",
    name: "Testimonials",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("name", 255, true),
      text("text", true),
      float("rating"),
      varchar("avatarFileId", 255),
      varchar("avatarUrl", 1000),
      varchar("role", 120),
      bool("isVisible", true),
      integer("sortOrder"),
    ],
    indexes: [
      keyIndex("testimonials_restaurantId", ["restaurantId"]),
      keyIndex("testimonials_rest_visible", ["restaurantId", "isVisible"]),
      keyIndex("testimonials_rest_sortOrder", ["restaurantId", "sortOrder"]),
    ],
  },
  {
    id: "faqs",
    name: "FAQs",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("question", 500, true),
      text("answer", true),
      text("translations"),
      bool("isVisible", true),
      integer("sortOrder"),
    ],
    indexes: [
      keyIndex("faqs_restaurantId_idx", ["restaurantId"]),
      keyIndex("faqs_restaurant_visible", ["restaurantId", "isVisible"]),
      keyIndex("faqs_restaurant_sortOrder", ["restaurantId", "sortOrder"]),
    ],
  },
  {
    id: "site_settings",
    name: "Site Settings",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("currency", 20, true),
      varchar("language", 20, true),
      varchar("direction", 10, true),
      varchar("orderMode", 50, true),
      varchar("reservationMode", 50, true),
      bool("deliveryEnabled", false, true),
      bool("pickupEnabled", false, false),
      float("deliveryBaseFee"),
      float("freeDeliveryThreshold"),
      float("minimumOrderAmount"),
      varchar("estimatedDeliveryMinutes", 80),
      text("deliveryAreas"),
      text("deliveryInstructions"),
      text("heroTitle"),
      text("heroSubtitle"),
      varchar("primaryCtaText", 160),
      varchar("secondaryCtaText", 160),
      varchar("heroMediaType", 40, false, "image"),
      varchar("heroImageUrl", 1000),
      varchar("heroVideoUrl", 1000),
      varchar("heroLayout", 40, false, "split"),
      varchar("themePreset", 60, false, "classic_red"),
      varchar("fontPreset", 40, false, "modern"),
      varchar("cardStyle", 40, false, "soft"),
      varchar("buttonStyle", 40, false, "rounded"),
      varchar("headerStyle", 40, false, "clean"),
      varchar("footerStyle", 40, false, "dark"),
      varchar("sectionSpacing", 40, false, "normal"),
      varchar("backgroundStyle", 40, false, "warm"),
      varchar("featuredSectionTitle", 255),
      varchar("offersSectionTitle", 255),
      varchar("gallerySectionTitle", 255),
      varchar("testimonialsSectionTitle", 255),
      varchar("contactSectionTitle", 255),
      varchar("faqSectionTitle", 255),
      text("translations"),
      bool("requireManualReservationConfirmation", false, false),
      bool("requireDepositForLargeGroups", false, false),
      integer("depositThresholdPeople"),
      float("depositAmount"),
      text("depositPolicyText"),
      text("cancellationPolicyText"),
      integer("maxPeoplePerReservation"),
      bool("hideCompletedOrdersFromMainList", false, true),
      bool("hideCancelledOrdersFromMainList", false, true),
      bool("showPastReservationsInSeparateTab", false, true),
      bool("enableManualArchiveActions", false, true),
      bool("autoArchiveCompletedOrders", false, false),
      integer("orderAutoArchiveAfterHours"),
      bool("autoArchiveCompletedReservations", false, false),
      integer("reservationAutoArchiveAfterHours"),
      bool("showHero", true),
      bool("showTrustBadges", true),
      bool("showFeatured", false, true),
      bool("showFeaturedDishes", true),
      bool("showOffers", true),
      bool("showGallery", true),
      bool("showTestimonials", true),
      bool("showActionGrid", true),
      bool("showContact", false, true),
      bool("showFaq", true),
      bool("showFooter", true),
    ],
    indexes: [keyIndex("settings_restaurantId_idx", ["restaurantId"])],
  },
  {
    id: "orders",
    name: "Orders",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("customerUserId", 255),
      varchar("customerProfileId", 255),
      varchar("trackingCode", 80),
      varchar("customerName", 255, true),
      varchar("customerPhone", 50, true),
      varchar("customerAddress", 500),
      varchar("fulfillmentType", 50),
      varchar("deliveryArea", 255),
      float("deliveryFee"),
      text("deliveryNotes"),
      text("notes"),
      float("totalAmount", true),
      varchar("status", 50, true),
      varchar("source", 50, true),
      bool("isArchived", false, false),
      datetime("archivedAt"),
      text("archiveReason"),
      varchar("createdAtText", 80),
    ],
    indexes: [
      keyIndex("orders_restaurantId_idx", ["restaurantId"]),
      keyIndex("orders_restaurant_status", ["restaurantId", "status"]),
      keyIndex("orders_restaurant_archived", ["restaurantId", "isArchived"]),
      keyIndex("orders_trackingCode_idx", ["trackingCode"]),
      keyIndex("orders_restaurant_tracking", ["restaurantId", "trackingCode"]),
      keyIndex("orders_customer_user", ["restaurantId", "customerUserId"]),
    ],
  },
  {
    id: "order_items",
    name: "Order Items",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("orderId", 255, true),
      varchar("dishId", 255),
      varchar("dishName", 255, true),
      integer("quantity", true),
      float("unitPrice", true),
      float("subtotal", true),
    ],
    indexes: [
      keyIndex("order_items_restaurantId", ["restaurantId"]),
      keyIndex("order_items_orderId_idx", ["orderId"]),
    ],
  },
  {
    id: "reservations",
    name: "Reservations",
    columns: [
      varchar("restaurantId", 255, true),
      varchar("customerUserId", 255),
      varchar("customerProfileId", 255),
      varchar("trackingCode", 80),
      varchar("customerName", 255, true),
      varchar("customerPhone", 50, true),
      varchar("reservationDate", 50, true),
      varchar("reservationTime", 50, true),
      integer("peopleCount", true),
      text("notes"),
      varchar("status", 50, true),
      varchar("depositStatus", 30),
      float("depositAmount"),
      text("depositNotes"),
      text("confirmationNotes"),
      bool("policyAccepted", false, false),
      bool("isArchived", false, false),
      datetime("archivedAt"),
      text("archiveReason"),
      varchar("createdAtText", 80),
    ],
    indexes: [
      keyIndex("reservations_restaurantId", ["restaurantId"]),
      keyIndex("reservations_rest_status", ["restaurantId", "status"]),
      keyIndex("reservations_rest_archived", ["restaurantId", "isArchived"]),
      keyIndex("reservations_trackingCode_idx", ["trackingCode"]),
      keyIndex("reservations_rest_tracking", ["restaurantId", "trackingCode"]),
      keyIndex("reservations_customer_user", ["restaurantId", "customerUserId"]),
    ],
  },
  {
    id: "audit_logs",
    name: "Audit Logs",
    columns: [
      varchar("restaurantId", 255),
      varchar("userId", 255),
      varchar("action", 120, true),
      varchar("entityType", 120, true),
      varchar("entityId", 255),
      text("metadata"),
      varchar("createdAtText", 80),
    ],
    indexes: [
      keyIndex("audit_restaurantId_idx", ["restaurantId"]),
      keyIndex("audit_userId_idx", ["userId"]),
    ],
  },
];

async function ensureDatabase() {
  try {
    await databases.get({ databaseId: config.databaseId });
    log("already exists", `database ${config.databaseId}`);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    await databases.create({
      databaseId: config.databaseId,
      name: config.databaseId,
      enabled: true,
    });
    log("created", `database ${config.databaseId}`);
  }
}

async function ensureBucket() {
  try {
    await storage.getBucket({ bucketId: config.bucketId });
    log("already exists", `bucket ${config.bucketId}`);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    await storage.createBucket({
      bucketId: config.bucketId,
      name: config.bucketId,
      fileSecurity: true,
      enabled: true,
    });
    log("created", `bucket ${config.bucketId}`);
  }
}

async function ensureTable(table) {
  try {
    await tablesDB.getTable({
      databaseId: config.databaseId,
      tableId: table.id,
    });
    log("already exists", `table ${table.id}`);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }

    await tablesDB.createTable({
      databaseId: config.databaseId,
      tableId: table.id,
      name: table.name,
      permissions: table.permissions ?? [],
      rowSecurity: true,
      enabled: true,
    });
    log("created", `table ${table.id}`);
  }
}

async function waitForColumn(tableId, key) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const column = await tablesDB.getColumn({
      databaseId: config.databaseId,
      tableId,
      key,
    });

    if (isReadyStatus(column)) {
      return column;
    }

    if (column.status === "failed") {
      throw new Error(`column ${tableId}.${key} failed: ${column.error ?? "unknown error"}`);
    }

    await sleep(1000);
  }

  log("warning", `column ${tableId}.${key} is still processing; continuing`);
  return null;
}

async function waitForIndex(tableId, key) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const tableIndex = await tablesDB.getIndex({
      databaseId: config.databaseId,
      tableId,
      key,
    });

    if (isReadyStatus(tableIndex)) {
      return tableIndex;
    }

    if (tableIndex.status === "failed") {
      throw new Error(`index ${tableId}.${key} failed: ${tableIndex.error ?? "unknown error"}`);
    }

    await sleep(1000);
  }

  log("warning", `index ${tableId}.${key} is still processing; continuing`);
  return null;
}

async function createColumn(tableId, column) {
  const base = {
    databaseId: config.databaseId,
    tableId,
    key: column.key,
    required: column.required,
  };

  if (column.xdefault !== undefined && !column.required) {
    base.xdefault = column.xdefault;
  }

  switch (column.kind) {
    case "varchar":
      return tablesDB.createVarcharColumn({ ...base, size: column.size });
    case "text":
      return tablesDB.createTextColumn(base);
    case "email":
      return tablesDB.createEmailColumn(base);
    case "boolean":
      return tablesDB.createBooleanColumn(base);
    case "float":
      return tablesDB.createFloatColumn(base);
    case "integer":
      return tablesDB.createIntegerColumn(base);
    case "datetime":
      return tablesDB.createDatetimeColumn(base);
    default:
      throw new Error(`unknown column kind: ${column.kind}`);
  }
}

async function ensureColumn(tableId, column) {
  try {
    const existingColumn = await tablesDB.getColumn({
      databaseId: config.databaseId,
      tableId,
      key: column.key,
    });
    log("already exists", `column ${tableId}.${column.key}`);

    if (!isReadyStatus(existingColumn)) {
      await waitForColumn(tableId, column.key);
    }

    return;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  try {
    await createColumn(tableId, column);
    log("created", `column ${tableId}.${column.key}`);
    await waitForColumn(tableId, column.key);
  } catch (error) {
    if (isConflictError(error)) {
      log("already exists", `column ${tableId}.${column.key}`);
      return;
    }

    throw error;
  }
}

async function ensureIndex(tableId, tableIndex) {
  try {
    const existingIndex = await tablesDB.getIndex({
      databaseId: config.databaseId,
      tableId,
      key: tableIndex.key,
    });
    log("already exists", `index ${tableId}.${tableIndex.key}`);

    if (!isReadyStatus(existingIndex)) {
      await waitForIndex(tableId, tableIndex.key);
    }

    return;
  } catch (error) {
    if (!isNotFoundError(error)) {
      log("warning", `could not inspect index ${tableId}.${tableIndex.key}: ${getErrorMessage(error)}`);
      return;
    }
  }

  try {
    await tablesDB.createIndex({
      databaseId: config.databaseId,
      tableId,
      key: tableIndex.key,
      type: tableIndex.type,
      columns: tableIndex.columns,
    });
    log("created", `index ${tableId}.${tableIndex.key}`);
    await waitForIndex(tableId, tableIndex.key);
  } catch (error) {
    if (isConflictError(error)) {
      log("already exists", `index ${tableId}.${tableIndex.key}`);
      return;
    }

    log("warning", `skipped index ${tableId}.${tableIndex.key}: ${getErrorMessage(error)}`);
  }
}

async function setupTable(table) {
  await ensureTable(table);

  for (const column of table.columns) {
    try {
      await ensureColumn(table.id, column);
    } catch (error) {
      log("error", `column ${table.id}.${column.key}: ${getErrorMessage(error)}`);
    }
  }

  for (const tableIndex of table.indexes) {
    await ensureIndex(table.id, tableIndex);
  }
}

async function seedDemoRestaurant() {
  const tableId = "restaurants";
  let existingRows;

  try {
    existingRows = await tablesDB.listRows({
      databaseId: config.databaseId,
      tableId,
      queries: [
        Query.equal("slug", config.defaultRestaurantSlug),
        Query.limit(1),
      ],
    });
  } catch (error) {
    log("warning", `skipped demo restaurant lookup: ${getErrorMessage(error)}`);
    log("warning", "seed skipped to avoid duplicate rows while slug index is unavailable");
    return null;
  }

  const existingRestaurant = existingRows.rows[0];

  if (existingRestaurant) {
    log("already exists", `demo restaurant slug ${config.defaultRestaurantSlug}`);
    return existingRestaurant.$id;
  }

  const row = await tablesDB.createRow({
    databaseId: config.databaseId,
    tableId,
    rowId: ID.unique(),
    data: {
      slug: config.defaultRestaurantSlug,
      name: "Demo Restaurant",
      nameAr: "مطعم تجريبي",
      status: "active",
      plan: "starter",
      billingStatus: "trial",
      supportLevel: "basic",
      teamId: "",
      ownerUserId: "",
      businessType: "restaurant",
      tagline: "Demo restaurant",
      description: "Demo restaurant used for local Appwrite setup.",
      primaryColor: "#e51b2b",
      secondaryColor: "#f97316",
      accentColor: "#fbbf24",
      successColor: "#22c55e",
      phone: "",
      whatsappNumber: "",
      address: "",
      workingHours: "",
      domainType: "pixelone_path",
      domainStatus: "not_configured",
      dnsTarget: "pixelonevisuals.tech",
    },
  });

  log("created", `demo restaurant slug ${config.defaultRestaurantSlug}`);
  return row.$id;
}

function printProfileExample(restaurantRowId) {
  console.log("");
  console.log("Manual profile row example:");
  console.log(JSON.stringify(
    {
      userId: "APPWRITE_USER_ID",
      restaurantId: restaurantRowId ?? "RESTAURANT_ROW_ID",
      teamId: "TEAM_ID_OPTIONAL",
      role: "owner",
      fullName: "اسم صاحب المطعم",
      email: "owner@example.com",
      phone: "0600000000",
      isActive: true,
    },
    null,
    2,
  ));
}

async function main() {
  log("skipped", "React .env.local is not read by this setup script");
  log("skipped", "APPWRITE_API_KEY is used only in this local Node script");

  await ensureDatabase();
  await ensureBucket();

  for (const table of tables) {
    await setupTable(table);
  }

  const restaurantRowId = await seedDemoRestaurant();

  console.log("");
  console.log(`RESTAURANT_ROW_ID=${restaurantRowId ?? "not-created"}`);
  printProfileExample(restaurantRowId);
}

main().catch((error) => {
  console.error(`[error] setup failed: ${getErrorMessage(error)}`);
  process.exit(1);
});
