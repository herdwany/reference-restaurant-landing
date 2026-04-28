import { Client, ID, Query, TablesDB } from "node-appwrite";

const MAX_TEXT_LENGTH = 500;
const ALLOWED_DOMAIN_TYPES = ["pixelone_path", "subdomain", "custom_domain"];
const ALLOWED_DOMAIN_STATUSES = ["not_configured", "pending_dns", "pending_verification", "active", "failed"];
const ALLOWED_UPDATE_FIELDS = [
  "domainType",
  "subdomain",
  "customDomain",
  "domainStatus",
  "domainNotes",
  "domainVerifiedAt",
  "dnsTarget",
];

const env = (key, fallback = "") => process.env[key]?.trim() || fallback;

const config = {
  endpoint: env("APPWRITE_ENDPOINT", env("APPWRITE_FUNCTION_API_ENDPOINT")),
  projectId: env("APPWRITE_PROJECT_ID", env("APPWRITE_FUNCTION_PROJECT_ID")),
  apiKey: env("APPWRITE_API_KEY"),
  databaseId: env("APPWRITE_DATABASE_ID"),
  restaurantsTableId: env("APPWRITE_RESTAURANTS_TABLE_ID", "restaurants"),
  profilesTableId: env("APPWRITE_PROFILES_TABLE_ID", "profiles"),
  auditLogsTableId: env("APPWRITE_AUDIT_LOGS_TABLE_ID", "audit_logs"),
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

const getHeader = (req, key) => {
  const headers = req.headers ?? {};
  const normalizedKey = key.toLowerCase();

  for (const [headerKey, value] of Object.entries(headers)) {
    if (headerKey.toLowerCase() === normalizedKey) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return "";
};

const cleanText = (value, maxLength = MAX_TEXT_LENGTH) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
};

const normalizeEnumValue = (value) => cleanText(value, 80).toLowerCase();
const normalizeSubdomain = (value) => cleanText(value, 120).toLowerCase();
const normalizeCustomDomain = (value) => cleanText(value, 255).toLowerCase().replace(/\.$/, "");

const normalizeOptionalDatetime = (value, fieldName) => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = cleanText(value, 80);

  if (!trimmed) {
    return null;
  }

  const parsedDate = new Date(trimmed);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpError(400, `Invalid datetime value for ${fieldName}.`);
  }

  return parsedDate.toISOString();
};

const isValidSubdomain = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

const isValidCustomDomain = (value) => {
  if (!value || /\s/.test(value) || /^https?:\/\//i.test(value)) {
    return false;
  }

  if (/[/:?#]/.test(value)) {
    return false;
  }

  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);
};

const getUserId = (req) => cleanText(getHeader(req, "x-appwrite-user-id"), 255);

const createTablesDb = () => {
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  return new TablesDB(client);
};

const validateCallerIsAgencyAdmin = async (tablesDb, userId) => {
  if (!userId) {
    throw new HttpError(401, "Unauthorized.");
  }

  try {
    const response = await tablesDb.listRows({
      databaseId: config.databaseId,
      tableId: config.profilesTableId,
      queries: [
        Query.equal("userId", userId),
        Query.equal("role", "agency_admin"),
        Query.equal("isActive", true),
        Query.limit(1),
      ],
    });

    const profile = response.rows[0];

    if (!profile) {
      throw new HttpError(403, "Forbidden.");
    }

    return profile;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(403, "Forbidden.");
  }
};

const parseUpdateInput = (input) => {
  const updates = {};
  const updateFields = [];

  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (!(field in input)) {
      continue;
    }

    if (field === "domainVerifiedAt") {
      updates[field] = normalizeOptionalDatetime(input[field], field);
      updateFields.push(field);
      continue;
    }

    if (field === "domainType" || field === "domainStatus") {
      const normalizedValue = normalizeEnumValue(input[field]);

      if (!normalizedValue) {
        throw new HttpError(400, `Field ${field} must not be empty.`);
      }

      updates[field] = normalizedValue;
      updateFields.push(field);
      continue;
    }

    if (field === "subdomain") {
      updates[field] = normalizeSubdomain(input[field]) || null;
      updateFields.push(field);
      continue;
    }

    if (field === "customDomain") {
      updates[field] = normalizeCustomDomain(input[field]) || null;
      updateFields.push(field);
      continue;
    }

    const cleanedValue = cleanText(input[field], field === "domainNotes" ? 1000 : 255);
    updates[field] = cleanedValue || null;
    updateFields.push(field);
  }

  if (updateFields.length === 0) {
    throw new HttpError(400, "No valid domain fields provided for update.");
  }

  return { updates, updateFields };
};

const validateAllowedEnumValues = (updates) => {
  if ("domainType" in updates && !ALLOWED_DOMAIN_TYPES.includes(updates.domainType)) {
    throw new HttpError(400, "Invalid value for domainType.");
  }

  if ("domainStatus" in updates && !ALLOWED_DOMAIN_STATUSES.includes(updates.domainStatus)) {
    throw new HttpError(400, "Invalid value for domainStatus.");
  }
};

const validateDomainFormat = (updates) => {
  if (updates.subdomain && !isValidSubdomain(updates.subdomain)) {
    throw new HttpError(400, "Invalid subdomain format.");
  }

  if (updates.customDomain && !isValidCustomDomain(updates.customDomain)) {
    throw new HttpError(400, "Invalid customDomain format.");
  }

  if (updates.domainType === "subdomain" && !updates.subdomain) {
    throw new HttpError(400, "subdomain is required when domainType is subdomain.");
  }

  if (updates.domainType === "custom_domain" && !updates.customDomain) {
    throw new HttpError(400, "customDomain is required when domainType is custom_domain.");
  }
};

const assertRestaurantExists = async (tablesDb, restaurantId) => {
  if (!restaurantId) {
    throw new HttpError(400, "restaurantId is required.");
  }

  try {
    return await tablesDb.getRow({
      databaseId: config.databaseId,
      tableId: config.restaurantsTableId,
      rowId: restaurantId,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && error.code === 404) {
      throw new HttpError(404, "Restaurant not found.");
    }

    throw error;
  }
};

const logAudit = async (tablesDb, userId, restaurantId, updateFields) => {
  try {
    await tablesDb.createRow({
      databaseId: config.databaseId,
      tableId: config.auditLogsTableId,
      rowId: ID.unique(),
      data: {
        restaurantId,
        userId,
        action: "agency.domain_settings.update",
        entityType: "restaurant",
        entityId: restaurantId,
        metadata: JSON.stringify({
          updatedFields: updateFields,
          source: "function",
        }),
        createdAtText: new Date().toISOString(),
      },
    });
  } catch (auditError) {
    console.warn("updateDomainSettings audit log failed", {
      code: typeof auditError === "object" && auditError !== null ? auditError.code ?? null : null,
    });
  }
};

const json = (res, body, status = 200) => res.json(body, status);

const getSafeErrorDiagnostics = (stage, caughtError) => {
  const isObjectError = typeof caughtError === "object" && caughtError !== null;

  return {
    stage,
    code:
      caughtError instanceof HttpError
        ? caughtError.status
        : isObjectError && "code" in caughtError
          ? caughtError.code
          : null,
    type:
      isObjectError && "type" in caughtError && caughtError.type
        ? caughtError.type
        : caughtError instanceof Error
          ? caughtError.name
          : typeof caughtError,
    message: caughtError instanceof Error ? caughtError.message : "Unknown updateDomainSettings error.",
  };
};

export default async ({ req, res, log, error }) => {
  let stage = "parse_input";

  try {
    assertFunctionConfig();

    const userId = getUserId(req);
    const input = parseBody(req);
    const restaurantId = cleanText(input.restaurantId, 255);
    const tablesDb = createTablesDb();

    stage = "verify_agency_admin";
    await validateCallerIsAgencyAdmin(tablesDb, userId);

    stage = "verify_restaurant";
    await assertRestaurantExists(tablesDb, restaurantId);

    stage = "parse_update_input";
    const { updates, updateFields } = parseUpdateInput(input);
    validateAllowedEnumValues(updates);
    validateDomainFormat(updates);

    stage = "update_restaurant";
    await tablesDb.updateRow({
      databaseId: config.databaseId,
      tableId: config.restaurantsTableId,
      rowId: restaurantId,
      data: updates,
    });

    stage = "write_audit_log";
    await logAudit(tablesDb, userId, restaurantId, updateFields);

    log(`Updated domain settings for restaurant ${restaurantId}`);

    return json(res, {
      ok: true,
      restaurantId,
      updatedFields: updateFields,
      message: "Domain settings updated successfully.",
    });
  } catch (caughtError) {
    const status = caughtError instanceof HttpError ? caughtError.status : 500;
    const safeDiagnostics = getSafeErrorDiagnostics(stage, caughtError);

    console.error("updateDomainSettings failed", safeDiagnostics);
    error(`updateDomainSettings failed at ${stage}`);

    return json(
      res,
      {
        ok: false,
        message: status >= 500 ? "Failed to update domain settings. Please try again." : safeDiagnostics.message,
      },
      status,
    );
  }
};
