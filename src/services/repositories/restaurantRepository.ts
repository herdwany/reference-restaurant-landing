import { AppwriteException, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { COLLECTIONS, DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type { BusinessType, Restaurant, RestaurantStatus } from "../../types/platform";
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
  draft: number;
  suspended: number;
  total: number;
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

const mapRestaurant = (row: RestaurantRow): Restaurant => ({
  id: row.$id,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  name: row.name,
  slug: row.slug,
  businessType: row.businessType,
  status: row.status,
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
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر حفظ بيانات المطعم. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر حفظ بيانات المطعم. تحقق من الاتصال أو الصلاحيات.";
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
    Query.equal("status", "active"),
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
      draft: stats.draft + (restaurant.status === "draft" ? 1 : 0),
      suspended: stats.suspended + (restaurant.status === "suspended" ? 1 : 0),
      total: stats.total + 1,
    }),
    { active: 0, draft: 0, suspended: 0, total: 0 },
  );
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
