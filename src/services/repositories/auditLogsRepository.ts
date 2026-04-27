import { ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig, isDevelopmentBuild } from "../../lib/appwriteIds";
import type { AuditLog, AuditLogMetadata } from "../../types/platform";

type AuditLogsRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED";

export class AuditLogsRepositoryError extends Error {
  code: AuditLogsRepositoryErrorCode;

  constructor(message: string, code: AuditLogsRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "AuditLogsRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface AuditLogRow extends Models.Row {
  restaurantId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: string | null;
  createdAtText?: string | null;
}

export type CreateAuditLogInput = {
  restaurantId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: AuditLogMetadata;
};

type AuditLogRowData = {
  restaurantId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  createdAtText: string;
};

const MAX_AUDIT_LIMIT = 100;
const DEFAULT_AUDIT_LIMIT = 50;
const MAX_METADATA_STRING_LENGTH = 180;
const MAX_METADATA_JSON_LENGTH = 3000;
const SENSITIVE_METADATA_KEY_PARTS = [
  "apikey",
  "api_key",
  "authorization",
  "customeraddress",
  "customer_address",
  "customerphone",
  "customer_phone",
  "password",
  "payload",
  "secret",
  "token",
  "address",
  "phone",
] as const;

const warnInDev = (message: string, error?: unknown) => {
  if (isDevelopmentBuild) {
    console.warn(message, error);
  }
};

// TODO: These MVP client-side audit logs are not tamper-proof.
// Move sensitive audit writes, especially order/reservation status changes, to Functions or a team/agency backend.
// TODO: Keep metadata free of personal customer data, secrets, API keys, and full payloads.
// Always read logs with a restaurantId filter; never expose cross-restaurant activity from the client.
const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new AuditLogsRepositoryError("تعذر تحديد المطعم الحالي لقراءة سجل النشاط.", "INVALID_INPUT");
  }
};

const isSensitiveMetadataKey = (key: string) => {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return SENSITIVE_METADATA_KEY_PARTS.some((part) => normalizedKey.includes(part));
};

const toSafeMetadata = (metadata: AuditLogMetadata | undefined): AuditLogMetadata | undefined => {
  if (!metadata) {
    return undefined;
  }

  const safeEntries = Object.entries(metadata)
    .filter(([key]) => key.trim() && !isSensitiveMetadataKey(key))
    .map(([key, value]) => [
      key,
      typeof value === "string" && value.length > MAX_METADATA_STRING_LENGTH
        ? `${value.slice(0, MAX_METADATA_STRING_LENGTH)}...`
        : value,
    ] as const);

  return safeEntries.length > 0 ? Object.fromEntries(safeEntries) : undefined;
};

const metadataToJson = (metadata: AuditLogMetadata | undefined) => {
  const safeMetadata = toSafeMetadata(metadata);

  if (!safeMetadata) {
    return null;
  }

  const json = JSON.stringify(safeMetadata);

  if (json.length <= MAX_METADATA_JSON_LENGTH) {
    return json;
  }

  return JSON.stringify({ truncated: true });
};

const parseMetadata = (metadata: string | null | undefined): AuditLogMetadata | undefined => {
  if (!metadata) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(metadata);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }

    return Object.entries(parsed).reduce<AuditLogMetadata>((result, [key, value]) => {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        result[key] = value;
      }

      return result;
    }, {});
  } catch {
    return undefined;
  }
};

const mapAuditLog = (row: AuditLogRow): AuditLog => ({
  id: row.$id,
  restaurantId: row.restaurantId ?? undefined,
  userId: row.userId ?? undefined,
  action: row.action,
  entityType: row.entityType,
  entityId: row.entityId ?? undefined,
  metadata: parseMetadata(row.metadata),
  createdAt: row.$createdAt ?? row.createdAtText ?? undefined,
  updatedAt: row.$updatedAt,
});

export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog | null> {
  if (!hasAppwriteDataConfig) {
    warnInDev("Audit log skipped because Appwrite TablesDB is not configured.");
    return null;
  }

  const action = input.action.trim();
  const entityType = input.entityType.trim();

  if (!action || !entityType) {
    warnInDev("Audit log skipped because action or entityType is missing.");
    return null;
  }

  try {
    const row = await databases.createRow<AuditLogRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.auditLogs,
      rowId: ID.unique(),
      data: {
        restaurantId: optionalText(input.restaurantId),
        userId: optionalText(input.userId),
        action,
        entityType,
        entityId: optionalText(input.entityId),
        metadata: metadataToJson(input.metadata),
        createdAtText: new Date().toISOString(),
      } satisfies AuditLogRowData,
    });

    return mapAuditLog(row);
  } catch (error) {
    warnInDev("Audit log write failed. Original admin action was not blocked.", error);
    return null;
  }
}

export async function getAuditLogsByRestaurant(restaurantId: string, limit = DEFAULT_AUDIT_LIMIT): Promise<AuditLog[]> {
  if (!hasAppwriteDataConfig) {
    throw new AuditLogsRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }

  assertRestaurantId(restaurantId);

  const safeLimit = Math.min(Math.max(Math.trunc(limit) || DEFAULT_AUDIT_LIMIT, 1), MAX_AUDIT_LIMIT);

  try {
    const response = await databases.listRows<AuditLogRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.auditLogs,
      queries: [Query.equal("restaurantId", restaurantId), Query.orderDesc("$createdAt"), Query.limit(safeLimit)],
    });

    return response.rows.map(mapAuditLog);
  } catch (error) {
    throw new AuditLogsRepositoryError("تعذر تحميل سجل النشاط. تحقق من الاتصال أو صلاحيات Appwrite.", "READ_FAILED", error);
  }
}
