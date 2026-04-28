#!/usr/bin/env node
// Read-only export utility. This script must never create, update, delete, or upload Appwrite data.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { AppwriteException, Client, Query, TablesDB } from "node-appwrite";

const setupEnvPath = resolve(process.cwd(), ".env.setup");

if (existsSync(setupEnvPath)) {
  dotenv.config({ path: setupEnvPath, quiet: true });
} else {
  console.warn("[warning] .env.setup not found. Reading process.env only.");
}

const usage = `Usage:
npm run export:client -- --slug demo-restaurant
npm run export:client -- --restaurantId <rowId>

Direct:
node scripts/exportClientData.mjs --slug demo-restaurant
node scripts/exportClientData.mjs --restaurantId <rowId>`;

const requiredEnv = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
  "APPWRITE_BUCKET_ID",
];

const TABLES = {
  restaurants: "restaurants",
  siteSettings: "site_settings",
  dishes: "dishes",
  offers: "offers",
  faqs: "faqs",
  galleryItems: "gallery_items",
  orders: "orders",
  orderItems: "order_items",
  reservations: "reservations",
  auditLogs: "audit_logs",
  profiles: "profiles",
};

const EXPORT_TABLES = [
  { key: "site_settings", tableId: TABLES.siteSettings, fileName: "site_settings.json" },
  { key: "dishes", tableId: TABLES.dishes, fileName: "dishes.json" },
  { key: "offers", tableId: TABLES.offers, fileName: "offers.json" },
  { key: "faqs", tableId: TABLES.faqs, fileName: "faqs.json" },
  { key: "gallery_items", tableId: TABLES.galleryItems, fileName: "gallery_items.json" },
  { key: "orders", tableId: TABLES.orders, fileName: "orders.json" },
  { key: "reservations", tableId: TABLES.reservations, fileName: "reservations.json" },
  { key: "audit_logs", tableId: TABLES.auditLogs, fileName: "audit_logs.json" },
  { key: "profiles", tableId: TABLES.profiles, fileName: "profiles.json" },
];

const PAGE_LIMIT = 100;
const MAX_PAGES = 1000;
const SENSITIVE_KEY_PATTERN =
  /password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|jwt|session|private[_-]?key/i;

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const shouldRetryRead = (error) => {
  const message = getErrorMessage(error).toLowerCase();
  const code = Number(error?.code);
  return message.includes("fetch failed") || message.includes("timeout") || code === 429 || code >= 500;
};

async function withReadRetry(operation, label) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetryRead(error) || attempt === 3) {
        break;
      }

      console.warn(`[warning] ${label} failed; retrying read (${attempt}/2).`);
      await sleep(attempt * 500);
    }
  }

  throw lastError;
}

const parseArgs = (argv) => {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--slug") {
      result.slug = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg === "--restaurantId") {
      result.restaurantId = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    }
  }

  return result;
};

const fail = (message, details) => {
  console.error(`[error] ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
};

const isMissingValue = (value) => !value || value.includes("<") || value.includes(">");

const getErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const isAppwriteError = (error) => error instanceof AppwriteException || typeof error?.code === "number";
const isNotFoundError = (error) => isAppwriteError(error) && error.code === 404;

const formatAppwriteError = (tableId, operation, error) => {
  const message = getErrorMessage(error);
  const code = typeof error?.code === "number" ? ` code=${error.code}` : "";
  return `${operation} failed for table '${tableId}'.${code} ${message}`;
};

const safeName = (value) =>
  String(value || "restaurant")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "restaurant";

const exportTimestamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "").replace(/:/g, "-");

const sanitizeForExport = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeForExport);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, nestedValue]) => [key, sanitizeForExport(nestedValue)]),
  );
};

const writeJson = async (filePath, data) => {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const createClient = (config) => {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return new TablesDB(client);
};

async function getTableIfExists(tablesDb, config, tableId, warnings) {
  try {
    return await withReadRetry(
      () =>
        tablesDb.getTable({
          databaseId: config.databaseId,
          tableId,
        }),
      `getTable ${tableId}`,
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      warnings.push(`Table '${tableId}' does not exist and was exported as an empty array.`);
      return null;
    }

    throw new Error(formatAppwriteError(tableId, "getTable", error));
  }
}

async function listAllRows(tablesDb, config, tableId, queries = []) {
  const rows = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_LIMIT;
    const response = await withReadRetry(
      () =>
        tablesDb.listRows({
          databaseId: config.databaseId,
          tableId,
          queries: [...queries, Query.limit(PAGE_LIMIT), Query.offset(offset)],
        }),
      `listRows ${tableId} offset ${offset}`,
    );

    const pageRows = response.rows ?? [];
    rows.push(...pageRows);

    if (pageRows.length < PAGE_LIMIT) {
      return rows;
    }
  }

  throw new Error(`Pagination safety limit reached while reading table '${tableId}'.`);
}

async function listRowsByRestaurantId(tablesDb, config, tableId, restaurantId) {
  return listAllRows(tablesDb, config, tableId, [Query.equal("restaurantId", restaurantId)]);
}

async function listOrderItemsByOrderIds(tablesDb, config, tableId, orders, warnings) {
  const resultsById = new Map();

  for (const order of orders) {
    const orderId = order.$id;
    if (!orderId) {
      warnings.push("Skipped an order without $id while exporting order_items fallback.");
      continue;
    }

    const orderItems = await listAllRows(tablesDb, config, tableId, [Query.equal("orderId", orderId)]);
    for (const item of orderItems) {
      resultsById.set(item.$id ?? `${orderId}-${resultsById.size}`, item);
    }
  }

  return Array.from(resultsById.values());
}

async function resolveRestaurant(tablesDb, config, args) {
  if (args.slug) {
    let response;

    try {
      response = await withReadRetry(
        () =>
          tablesDb.listRows({
            databaseId: config.databaseId,
            tableId: TABLES.restaurants,
            queries: [Query.equal("slug", args.slug), Query.limit(1)],
          }),
        "resolve restaurant by slug",
      );
    } catch (error) {
      throw new Error(formatAppwriteError(TABLES.restaurants, "listRows", error));
    }

    const restaurant = response.rows?.[0];

    if (!restaurant) {
      fail(`No restaurant found with slug '${args.slug}'.`);
    }

    return restaurant;
  }

  try {
    return await withReadRetry(
      () =>
        tablesDb.getRow({
          databaseId: config.databaseId,
          tableId: TABLES.restaurants,
          rowId: args.restaurantId,
        }),
      "resolve restaurant by restaurantId",
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      fail(`No restaurant found with restaurantId '${args.restaurantId}'.`);
    }

    throw new Error(formatAppwriteError(TABLES.restaurants, "getRow", error));
  }
}

async function exportRestaurantTable(tablesDb, config, restaurantId, table, warnings) {
  console.log(`Exporting ${table.key}...`);

  const existingTable = await getTableIfExists(tablesDb, config, table.tableId, warnings);
  if (!existingTable) {
    return [];
  }

  try {
    const rows = await listRowsByRestaurantId(tablesDb, config, table.tableId, restaurantId);
    console.log(`Exported ${rows.length} ${table.key}`);
    return rows;
  } catch (error) {
    warnings.push(formatAppwriteError(table.tableId, "listRows", error));
    console.warn(`[warning] Skipped ${table.key}: ${getErrorMessage(error)}`);
    return [];
  }
}

async function exportOrderItems(tablesDb, config, restaurantId, orders, warnings) {
  console.log("Exporting order_items...");

  const existingTable = await getTableIfExists(tablesDb, config, TABLES.orderItems, warnings);
  if (!existingTable) {
    return [];
  }

  try {
    const rows = await listRowsByRestaurantId(tablesDb, config, TABLES.orderItems, restaurantId);
    console.log(`Exported ${rows.length} order_items`);
    return rows;
  } catch (restaurantIdError) {
    warnings.push(
      "order_items could not be exported by restaurantId. Falling back to orderId-based export for this restaurant.",
    );

    try {
      const rows = await listOrderItemsByOrderIds(tablesDb, config, TABLES.orderItems, orders, warnings);
      console.log(`Exported ${rows.length} order_items`);
      return rows;
    } catch (orderIdError) {
      warnings.push(formatAppwriteError(TABLES.orderItems, "listRows", orderIdError));
      console.warn(`[warning] Skipped order_items: ${getErrorMessage(orderIdError)}`);
      return [];
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage);
    return;
  }

  if (!args.slug && !args.restaurantId) {
    console.log(usage);
    return;
  }

  if (args.slug && args.restaurantId) {
    fail("Pass either --slug or --restaurantId, not both.", usage);
  }

  const missingEnv = requiredEnv.filter((key) => isMissingValue(process.env[key]?.trim()));
  if (missingEnv.length > 0) {
    fail(
      `Missing setup environment values: ${missingEnv.join(", ")}`,
      "Copy .env.setup.example to .env.setup and fill it with local setup credentials.",
    );
  }

  const config = {
    endpoint: process.env.APPWRITE_ENDPOINT.trim(),
    projectId: process.env.APPWRITE_PROJECT_ID.trim(),
    apiKey: process.env.APPWRITE_API_KEY.trim(),
    databaseId: process.env.APPWRITE_DATABASE_ID.trim(),
    bucketId: process.env.APPWRITE_BUCKET_ID.trim(),
  };

  console.log("Starting export...");

  const warnings = [
    "TODO: audit_logs.metadata should remain sanitized at write time; this export preserves current stored values except known secret fields.",
    "TODO: build export:assets later if Storage file downloads become required.",
  ];

  const tablesDb = createClient(config);
  const restaurantsTable = await getTableIfExists(tablesDb, config, TABLES.restaurants, warnings);

  if (!restaurantsTable) {
    fail("The restaurants table does not exist. Cannot resolve a client export.");
  }

  const restaurant = await resolveRestaurant(tablesDb, config, args);
  const restaurantId = restaurant.$id;
  const slug = restaurant.slug || args.slug || restaurantId;
  const restaurantName = restaurant.nameAr || restaurant.name || slug;

  console.log(`Resolved restaurant: ${restaurantName} (${slug})`);

  const exportRoot = resolve(process.cwd(), "exports", safeName(slug || restaurantId), exportTimestamp());
  await mkdir(exportRoot, { recursive: true });

  const exported = {
    restaurant: sanitizeForExport(restaurant),
  };

  await writeJson(resolve(exportRoot, "restaurant.json"), exported.restaurant);

  const counts = {
    restaurant: 1,
  };

  let exportedOrders = [];

  for (const table of EXPORT_TABLES) {
    const rows = await exportRestaurantTable(tablesDb, config, restaurantId, table, warnings);
    const sanitizedRows = sanitizeForExport(rows);
    exported[table.key] = sanitizedRows;
    counts[table.key] = sanitizedRows.length;
    await writeJson(resolve(exportRoot, table.fileName), sanitizedRows);

    if (table.key === "orders") {
      exportedOrders = rows;
    }
  }

  const orderItems = await exportOrderItems(tablesDb, config, restaurantId, exportedOrders, warnings);
  const sanitizedOrderItems = sanitizeForExport(orderItems);
  exported.order_items = sanitizedOrderItems;
  counts.order_items = sanitizedOrderItems.length;
  await writeJson(resolve(exportRoot, "order_items.json"), sanitizedOrderItems);

  const summary = {
    exportedAt: new Date().toISOString(),
    appwriteProjectId: config.projectId,
    databaseId: config.databaseId,
    bucketId: config.bucketId,
    restaurantId,
    slug,
    restaurantName,
    counts,
    warnings,
    version: "phase-9h-local-export-v1",
    schemaNote:
      "Read-only JSON export for one restaurant. Restore/import and Storage asset download are intentionally not implemented in Phase 9H.",
  };

  await writeJson(resolve(exportRoot, "export-summary.json"), summary);

  console.log(`Export written to: ${exportRoot}`);
  console.log("Done");
}

main().catch((error) => {
  console.error(`[error] ${getErrorMessage(error)}`);
  process.exit(1);
});
