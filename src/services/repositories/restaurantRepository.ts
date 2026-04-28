import { AppwriteException, ExecutionMethod, Query, type Models } from "appwrite";
import { databases, functions } from "../../lib/appwriteClient";
import {
  COLLECTIONS,
  DATABASE_ID,
  TABLES,
  UPDATE_CLIENT_CONTROLS_FUNCTION_ID,
  UPDATE_DOMAIN_SETTINGS_FUNCTION_ID,
  canUseDirectSensitiveTableFallback,
  hasAppwriteDataConfig,
  hasUpdateClientControlsFunctionConfig,
  hasUpdateDomainSettingsFunctionConfig,
  isDevelopmentBuild,
} from "../../lib/appwriteIds";
import type {
  BillingStatus,
  BusinessType,
  ClientPlan,
  DomainStatus,
  DomainType,
  FeatureFlags,
  Restaurant,
  RestaurantStatus,
  SupportLevel,
} from "../../types/platform";
import { getFirstRow, getRowById } from "./readRows";

type RestaurantRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED" | "WRITE_FAILED";

export class RestaurantRepositoryError extends Error {
  code: RestaurantRepositoryErrorCode;

  constructor(message: string, code: RestaurantRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "RestaurantRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface RestaurantRow extends Models.Row {
  name: string;
  slug: string;
  businessType: BusinessType;
  status: RestaurantStatus;
  plan?: ClientPlan | null;
  billingStatus?: BillingStatus | null;
  subscriptionEndsAt?: string | null;
  trialEndsAt?: string | null;
  supportLevel?: SupportLevel | null;
  features?: string | Partial<FeatureFlags> | null;
  teamId: string;
  ownerUserId: string;
  nameAr: string;
  tagline: string;
  description: string;
  logoFileId?: string | null;
  heroImageFileId?: string | null;
  heroImageUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  phone: string;
  whatsappNumber: string;
  email?: string | null;
  address: string;
  mapsUrl?: string | null;
  mapImageUrl?: string | null;
  workingHours: string;
  domain?: string | null;
  domainType?: DomainType | null;
  subdomain?: string | null;
  customDomain?: string | null;
  domainStatus?: DomainStatus | null;
  domainNotes?: string | null;
  domainVerifiedAt?: string | null;
  dnsTarget?: string | null;
}

export type RestaurantContactInput = {
  name: string;
  nameAr: string;
  tagline: string;
  description: string;
  logoFileId?: string;
  heroImageFileId?: string;
  heroImageUrl?: string;
  phone: string;
  whatsappNumber: string;
  email?: string;
  address: string;
  mapsUrl?: string;
  workingHours: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
};

export type AgencyRestaurantStats = {
  active: number;
  cancelled: number;
  draft: number;
  suspended: number;
  total: number;
};

export type RestaurantAgencyControlsInput = {
  billingStatus: BillingStatus;
  plan: ClientPlan;
  status: RestaurantStatus;
  subscriptionEndsAt?: string | null;
  supportLevel: SupportLevel;
  trialEndsAt?: string | null;
};

export type RestaurantDomainSettingsInput = {
  customDomain?: string | null;
  dnsTarget?: string | null;
  domainNotes?: string | null;
  domainStatus: DomainStatus;
  domainType: DomainType;
  domainVerifiedAt?: string | null;
  subdomain?: string | null;
};

type RestaurantContactRowData = {
  name: string;
  nameAr: string;
  tagline: string;
  description: string;
  logoFileId: string | null;
  heroImageFileId: string | null;
  heroImageUrl: string | null;
  phone: string;
  whatsappNumber: string;
  email: string | null;
  address: string;
  mapsUrl: string | null;
  workingHours: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
};

type RestaurantAgencyControlsRowData = {
  billingStatus: BillingStatus;
  plan: ClientPlan;
  status: RestaurantStatus;
  subscriptionEndsAt?: string;
  supportLevel: SupportLevel;
  trialEndsAt?: string;
};

type RestaurantDomainSettingsRowData = {
  customDomain: string | null;
  dnsTarget: string | null;
  domainNotes: string | null;
  domainStatus: DomainStatus;
  domainType: DomainType;
  domainVerifiedAt: string | null;
  subdomain: string | null;
};

const clientPlans = ["starter", "pro", "premium", "managed"] as const satisfies readonly ClientPlan[];
const billingStatuses = ["trial", "active", "overdue", "cancelled"] as const satisfies readonly BillingStatus[];
const restaurantStatuses = ["draft", "active", "suspended", "cancelled"] as const satisfies readonly RestaurantStatus[];
const supportLevels = ["basic", "standard", "priority", "managed"] as const satisfies readonly SupportLevel[];
const domainTypes = ["pixelone_path", "subdomain", "custom_domain"] as const satisfies readonly DomainType[];
const domainStatuses = ["not_configured", "pending_dns", "pending_verification", "active", "failed"] as const satisfies readonly DomainStatus[];

const isKnownClientPlan = (value: unknown): value is ClientPlan =>
  typeof value === "string" && clientPlans.includes(value as ClientPlan);

const isKnownBillingStatus = (value: unknown): value is BillingStatus =>
  typeof value === "string" && billingStatuses.includes(value as BillingStatus);

const isKnownRestaurantStatus = (value: unknown): value is RestaurantStatus =>
  typeof value === "string" && restaurantStatuses.includes(value as RestaurantStatus);

const isKnownSupportLevel = (value: unknown): value is SupportLevel =>
  typeof value === "string" && supportLevels.includes(value as SupportLevel);

const isKnownDomainType = (value: unknown): value is DomainType =>
  typeof value === "string" && domainTypes.includes(value as DomainType);

const isKnownDomainStatus = (value: unknown): value is DomainStatus =>
  typeof value === "string" && domainStatuses.includes(value as DomainStatus);

const normalizeEnumText = (value: string) => value.trim().toLowerCase();

const parseRestaurantFeatures = (value: RestaurantRow["features"]): Partial<FeatureFlags> | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }

    return parsed as Partial<FeatureFlags>;
  } catch {
    return undefined;
  }
};

const mapRestaurant = (row: RestaurantRow): Restaurant => ({
  id: row.$id,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  name: row.name,
  slug: row.slug,
  businessType: row.businessType,
  status: isKnownRestaurantStatus(row.status) ? row.status : "draft",
  plan: isKnownClientPlan(row.plan) ? row.plan : "starter",
  billingStatus: isKnownBillingStatus(row.billingStatus) ? row.billingStatus : "trial",
  subscriptionEndsAt: row.subscriptionEndsAt ?? undefined,
  trialEndsAt: row.trialEndsAt ?? undefined,
  supportLevel: isKnownSupportLevel(row.supportLevel) ? row.supportLevel : "basic",
  features: parseRestaurantFeatures(row.features),
  teamId: row.teamId,
  ownerUserId: row.ownerUserId,
  nameAr: row.nameAr,
  tagline: row.tagline,
  description: row.description,
  logoFileId: row.logoFileId ?? undefined,
  heroImageFileId: row.heroImageFileId ?? undefined,
  heroImageUrl: row.heroImageUrl ?? undefined,
  primaryColor: row.primaryColor,
  secondaryColor: row.secondaryColor,
  accentColor: row.accentColor,
  successColor: row.successColor,
  phone: row.phone,
  whatsappNumber: row.whatsappNumber,
  email: row.email ?? undefined,
  address: row.address,
  mapsUrl: row.mapsUrl ?? undefined,
  mapImageUrl: row.mapImageUrl ?? undefined,
  workingHours: row.workingHours,
  domain: row.domain ?? undefined,
  domainType: isKnownDomainType(row.domainType) ? row.domainType : "pixelone_path",
  subdomain: row.subdomain ?? undefined,
  customDomain: row.customDomain ?? undefined,
  domainStatus: isKnownDomainStatus(row.domainStatus) ? row.domainStatus : "not_configured",
  domainNotes: row.domainNotes ?? undefined,
  domainVerifiedAt: row.domainVerifiedAt ?? undefined,
  dnsTarget: row.dnsTarget ?? undefined,
});

const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const toRestaurantContactRowData = (input: RestaurantContactInput): RestaurantContactRowData => {
  const displayName = input.nameAr.trim() || input.name.trim();

  return {
    name: input.name.trim() || displayName,
    nameAr: input.nameAr.trim() || displayName,
    tagline: input.tagline.trim(),
    description: input.description.trim(),
    logoFileId: optionalText(input.logoFileId),
    heroImageFileId: optionalText(input.heroImageFileId),
    heroImageUrl: optionalText(input.heroImageUrl),
    phone: input.phone.trim(),
    whatsappNumber: input.whatsappNumber.trim(),
    email: optionalText(input.email),
    address: input.address.trim(),
    mapsUrl: optionalText(input.mapsUrl),
    workingHours: input.workingHours.trim(),
    primaryColor: input.primaryColor.trim(),
    secondaryColor: input.secondaryColor.trim(),
    accentColor: input.accentColor.trim(),
    successColor: input.successColor.trim(),
  };
};

const normalizeSubdomain = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

const normalizeCustomDomain = (value: string | null | undefined) =>
  value?.trim().toLowerCase().replace(/\.$/, "") ?? "";

const isValidSubdomain = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

const isValidCustomDomain = (value: string) => {
  if (!value || /\s/.test(value) || /^https?:\/\//i.test(value) || /[/:?#]/.test(value)) {
    return false;
  }

  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);
};

const toRestaurantDomainSettingsRowData = (input: RestaurantDomainSettingsInput): RestaurantDomainSettingsRowData => {
  const domainType = normalizeEnumText(input.domainType) as DomainType;
  const domainStatus = normalizeEnumText(input.domainStatus) as DomainStatus;
  const subdomain = normalizeSubdomain(input.subdomain);
  const customDomain = normalizeCustomDomain(input.customDomain);
  const domainVerifiedAt = normalizeOptionalDatetime(input.domainVerifiedAt);

  if (!isKnownDomainType(domainType)) {
    throw new RestaurantRepositoryError("نوع الدومين غير صالح.", "INVALID_INPUT");
  }

  if (!isKnownDomainStatus(domainStatus)) {
    throw new RestaurantRepositoryError("حالة الدومين غير صالحة.", "INVALID_INPUT");
  }

  if (domainType === "subdomain" && !subdomain) {
    throw new RestaurantRepositoryError("Subdomain مطلوب لهذا الخيار.", "INVALID_INPUT");
  }

  if (subdomain && !isValidSubdomain(subdomain)) {
    throw new RestaurantRepositoryError("استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط في subdomain.", "INVALID_INPUT");
  }

  if (domainType === "custom_domain" && !customDomain) {
    throw new RestaurantRepositoryError("Custom domain مطلوب لهذا الخيار.", "INVALID_INPUT");
  }

  if (customDomain && !isValidCustomDomain(customDomain)) {
    throw new RestaurantRepositoryError("اكتب الدومين بدون http:// أو https:// وبدون مسافات، مثل www.example.com.", "INVALID_INPUT");
  }

  return {
    domainType,
    subdomain: subdomain || null,
    customDomain: customDomain || null,
    domainStatus,
    domainNotes: optionalText(input.domainNotes ?? undefined),
    domainVerifiedAt: domainVerifiedAt ?? null,
    dnsTarget: optionalText(input.dnsTarget ?? undefined),
  };
};

// Security note: React guards are not final multi-tenant protection.
// Enforce restaurant-scoped writes with Appwrite Teams/Permissions or Functions before production.
// This mapper intentionally excludes status, teamId, ownerUserId, slug, domain, and restaurantId.
const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new RestaurantRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new RestaurantRepositoryError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const getWriteErrorMessage = (error: unknown) => {
  const devDetails =
    isDevelopmentBuild && error instanceof AppwriteException && error.message.trim()
      ? ` تفاصيل Appwrite: ${error.message.trim()}`
      : "";

  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return `تعذر حفظ بيانات المطعم. تحقق من تسجيل الدخول أو صلاحيات Appwrite.${devDetails}`;
  }

  return `تعذر حفظ بيانات المطعم. تحقق من الاتصال أو الصلاحيات.${devDetails}`;
};

const getReadErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر تحميل بيانات المطاعم. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر تحميل بيانات المطاعم. تحقق من الاتصال أو صلاحيات Appwrite.";
};

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const row = await getFirstRow<RestaurantRow>(COLLECTIONS.restaurants, [
    Query.equal("slug", slug),
    Query.limit(1),
  ]);

  return row ? mapRestaurant(row) : null;
}

export async function getRestaurantById(restaurantId: string): Promise<Restaurant | null> {
  const row = await getRowById<RestaurantRow>(COLLECTIONS.restaurants, restaurantId);
  return row ? mapRestaurant(row) : null;
}

// Phase 9A foundation: React route guards restrict this call to agency_admin.
// TODO Phase 9B/hardening: move broad agency restaurant listing behind Teams or an Appwrite Function.
export async function getRestaurantsForAgency(limit = 100): Promise<Restaurant[]> {
  assertAppwriteDataReady();

  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 100, 1), 100);

  try {
    const response = await databases.listRows<RestaurantRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.restaurants,
      queries: [Query.orderDesc("$createdAt"), Query.limit(safeLimit)],
    });

    return response.rows.map(mapRestaurant);
  } catch (error) {
    throw new RestaurantRepositoryError(getReadErrorMessage(error), "READ_FAILED", error);
  }
}

export function getRestaurantStatsForAgency(restaurants: readonly Restaurant[]): AgencyRestaurantStats {
  return restaurants.reduce<AgencyRestaurantStats>(
    (stats, restaurant) => ({
      active: stats.active + (restaurant.status === "active" ? 1 : 0),
      cancelled: stats.cancelled + (restaurant.status === "cancelled" ? 1 : 0),
      draft: stats.draft + (restaurant.status === "draft" ? 1 : 0),
      suspended: stats.suspended + (restaurant.status === "suspended" ? 1 : 0),
      total: stats.total + 1,
    }),
    { active: 0, cancelled: 0, draft: 0, suspended: 0, total: 0 },
  );
}

const normalizeOptionalDatetime = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const toRestaurantAgencyControlsRowData = (input: RestaurantAgencyControlsInput): RestaurantAgencyControlsRowData => {
  const status = normalizeEnumText(input.status) as RestaurantStatus;
  const plan = normalizeEnumText(input.plan) as ClientPlan;
  const billingStatus = normalizeEnumText(input.billingStatus) as BillingStatus;
  const supportLevel = normalizeEnumText(input.supportLevel) as SupportLevel;

  if (
    !isKnownRestaurantStatus(status) ||
    !isKnownClientPlan(plan) ||
    !isKnownBillingStatus(billingStatus) ||
    !isKnownSupportLevel(supportLevel)
  ) {
    throw new RestaurantRepositoryError("بيانات الباقة أو حالة المطعم غير صالحة.", "INVALID_INPUT");
  }

  const rowData: RestaurantAgencyControlsRowData = {
    status,
    plan,
    billingStatus,
    supportLevel,
  };

  const subscriptionEndsAt = normalizeOptionalDatetime(input.subscriptionEndsAt);
  const trialEndsAt = normalizeOptionalDatetime(input.trialEndsAt);

  if (subscriptionEndsAt) {
    rowData.subscriptionEndsAt = subscriptionEndsAt;
  }

  if (trialEndsAt) {
    rowData.trialEndsAt = trialEndsAt;
  }

  return rowData;
};

// TODO Phase 9D hardening: this MVP update runs from the React Client SDK for agency_admin only.
// Move plan/status updates to an Appwrite Function that verifies agency_admin and restaurant ownership.
// React feature guards are UX gates, not a final security boundary for sensitive data.
export async function updateRestaurantAgencyControls(
  restaurantId: string,
  input: RestaurantAgencyControlsInput,
): Promise<Restaurant> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const row = await databases.updateRow<RestaurantRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.restaurants,
      rowId: restaurantId,
      data: toRestaurantAgencyControlsRowData(input),
    });

    return mapRestaurant(row);
  } catch (error) {
    if (error instanceof RestaurantRepositoryError) {
      throw error;
    }

    throw new RestaurantRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

// TODO Phase 9F hardening: this MVP update runs from the React Client SDK for agency_admin only.
// Move domain metadata updates to an Appwrite Function that verifies agency_admin before production.
export async function updateRestaurantDomainSettings(
  restaurantId: string,
  input: RestaurantDomainSettingsInput,
): Promise<Restaurant> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const row = await databases.updateRow<RestaurantRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.restaurants,
      rowId: restaurantId,
      data: toRestaurantDomainSettingsRowData(input),
    });

    return mapRestaurant(row);
  } catch (error) {
    if (error instanceof RestaurantRepositoryError) {
      throw error;
    }

    throw new RestaurantRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function updateRestaurantContact(restaurantId: string, input: RestaurantContactInput): Promise<Restaurant> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const existingRestaurant = await databases.getRow<RestaurantRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.restaurants,
      rowId: restaurantId,
    });

    if (existingRestaurant.$id !== restaurantId) {
      throw new RestaurantRepositoryError("لا يمكن تعديل مطعم خارج نطاق الحساب الحالي.", "INVALID_INPUT");
    }

    const row = await databases.updateRow<RestaurantRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.restaurants,
      rowId: restaurantId,
      data: toRestaurantContactRowData(input),
    });

    return mapRestaurant(row);
  } catch (error) {
    if (error instanceof RestaurantRepositoryError) {
      throw error;
    }

    throw new RestaurantRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

// Production-hardened version: uses Appwrite Function with agency_admin verification.
// Fallback to direct SDK write only in non-production for development/testing.
export async function updateClientControlsViaFunction(
  restaurantId: string,
  input: RestaurantAgencyControlsInput,
): Promise<Restaurant> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  // If Function is configured, use it (production-safe)
  if (hasUpdateClientControlsFunctionConfig) {
    try {
      const execution = await functions.createExecution({
        functionId: UPDATE_CLIENT_CONTROLS_FUNCTION_ID,
        body: JSON.stringify({
          restaurantId,
          plan: input.plan,
          status: input.status,
          billingStatus: input.billingStatus,
          supportLevel: input.supportLevel,
          subscriptionEndsAt: input.subscriptionEndsAt,
          trialEndsAt: input.trialEndsAt,
        }),
        async: false,
        method: ExecutionMethod.POST,
        headers: {
          "content-type": "application/json",
        },
      });

      if (execution.status !== "completed" || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
        const body = execution.responseBody;
        let errorMessage = "Failed to update client controls via Function.";

        try {
          const response: Record<string, unknown> = JSON.parse(body);
          if (typeof response.message === "string") {
            errorMessage = response.message;
          }
        } catch {
          // Use default error message
        }

        throw new RestaurantRepositoryError(errorMessage, "WRITE_FAILED");
      }

      // Fetch updated restaurant to return current state
      const updatedRestaurant = await getRestaurantById(restaurantId);
      if (updatedRestaurant) {
        return updatedRestaurant;
      }
      throw new RestaurantRepositoryError("Failed to fetch updated restaurant after update.", "READ_FAILED");
    } catch (error) {
      if (error instanceof RestaurantRepositoryError) {
        throw error;
      }

      throw new RestaurantRepositoryError(
        "Failed to update client controls via Appwrite Function.",
        "WRITE_FAILED",
        error,
      );
    }
  }

  // Fallback to direct write in non-production only
  if (!canUseDirectSensitiveTableFallback) {
    throw new RestaurantRepositoryError(
      "Production environment requires updateClientControlsViaFunction to be configured.",
      "APPWRITE_NOT_CONFIGURED",
    );
  }

  return updateRestaurantAgencyControls(restaurantId, input);
}

// Production-hardened version: uses Appwrite Function with agency_admin verification.
// Fallback to direct SDK write only in non-production for development/testing.
export async function updateDomainSettingsViaFunction(
  restaurantId: string,
  input: RestaurantDomainSettingsInput,
): Promise<Restaurant> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  // If Function is configured, use it (production-safe)
  if (hasUpdateDomainSettingsFunctionConfig) {
    try {
      const execution = await functions.createExecution({
        functionId: UPDATE_DOMAIN_SETTINGS_FUNCTION_ID,
        body: JSON.stringify({
          restaurantId,
          domainType: input.domainType,
          subdomain: input.subdomain,
          customDomain: input.customDomain,
          dnsTarget: input.dnsTarget,
          domainStatus: input.domainStatus,
          domainVerifiedAt: input.domainVerifiedAt,
          domainNotes: input.domainNotes,
        }),
        async: false,
        method: ExecutionMethod.POST,
        headers: {
          "content-type": "application/json",
        },
      });

      if (execution.status !== "completed" || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
        const body = execution.responseBody;
        let errorMessage = "Failed to update domain settings via Function.";

        try {
          const response: Record<string, unknown> = JSON.parse(body);
          if (typeof response.message === "string") {
            errorMessage = response.message;
          }
        } catch {
          // Use default error message
        }

        throw new RestaurantRepositoryError(errorMessage, "WRITE_FAILED");
      }

      // Fetch updated restaurant to return current state
      const updatedRestaurant = await getRestaurantById(restaurantId);
      if (updatedRestaurant) {
        return updatedRestaurant;
      }
      throw new RestaurantRepositoryError("Failed to fetch updated restaurant after update.", "READ_FAILED");
    } catch (error) {
      if (error instanceof RestaurantRepositoryError) {
        throw error;
      }

      throw new RestaurantRepositoryError(
        "Failed to update domain settings via Appwrite Function.",
        "WRITE_FAILED",
        error,
      );
    }
  }

  // Fallback to direct write in non-production only
  if (!canUseDirectSensitiveTableFallback) {
    throw new RestaurantRepositoryError(
      "Production environment requires updateDomainSettingsViaFunction to be configured.",
      "APPWRITE_NOT_CONFIGURED",
    );
  }

  return updateRestaurantDomainSettings(restaurantId, input);
}
