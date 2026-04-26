import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type { OrderMode, ReservationMode, SiteDirection, SiteSettings } from "../../types/platform";

type SettingsRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED" | "WRITE_FAILED";

export class SettingsRepositoryError extends Error {
  code: SettingsRepositoryErrorCode;

  constructor(message: string, code: SettingsRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "SettingsRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface SiteSettingsRow extends Models.Row {
  restaurantId: string;
  currency: string;
  language: string;
  direction: SiteDirection;
  orderMode: OrderMode;
  reservationMode: ReservationMode;
  showHero: boolean;
  showTrustBadges: boolean;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showFaq: boolean;
  showFooter: boolean;
}

export type SiteSettingsMutationInput = {
  currency: string;
  language: string;
  direction: SiteDirection;
  orderMode: OrderMode;
  reservationMode: ReservationMode;
  showHero: boolean;
  showTrustBadges: boolean;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showFaq: boolean;
  showFooter: boolean;
};

type SiteSettingsRowData = SiteSettingsMutationInput;

type SiteSettingsCreateRowData = SiteSettingsRowData & {
  restaurantId: string;
};

const mapSiteSettings = (row: SiteSettingsRow): SiteSettings => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  currency: row.currency,
  language: row.language,
  direction: row.direction,
  orderMode: row.orderMode,
  reservationMode: row.reservationMode,
  showHero: row.showHero,
  showTrustBadges: row.showTrustBadges,
  showFeaturedDishes: row.showFeaturedDishes,
  showOffers: row.showOffers,
  showGallery: row.showGallery,
  showTestimonials: row.showTestimonials,
  showActionGrid: row.showActionGrid,
  showFaq: row.showFaq,
  showFooter: row.showFooter,
});

const toSiteSettingsRowData = (input: SiteSettingsMutationInput): SiteSettingsRowData => ({
  currency: input.currency.trim() || "د.م",
  language: input.language.trim() || "ar",
  direction: input.direction,
  orderMode: input.orderMode,
  reservationMode: input.reservationMode,
  showHero: input.showHero,
  showTrustBadges: input.showTrustBadges,
  showFeaturedDishes: input.showFeaturedDishes,
  showOffers: input.showOffers,
  showGallery: input.showGallery,
  showTestimonials: input.showTestimonials,
  showActionGrid: input.showActionGrid,
  showFaq: input.showFaq,
  showFooter: input.showFooter,
});

// Security note: React guards are not final multi-tenant protection.
// Enforce restaurant-scoped settings writes with Appwrite Teams/Permissions or Functions before production.
// Never accept restaurantId from a form/query string and do not enable public write on site_settings.
const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new SettingsRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new SettingsRepositoryError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const getWriteErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر حفظ الإعدادات. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر حفظ الإعدادات. تحقق من الاتصال أو الصلاحيات.";
};

export async function getSiteSettings(restaurantId: string): Promise<SiteSettings | null> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<SiteSettingsRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.siteSettings,
      queries: [Query.equal("restaurantId", restaurantId), Query.limit(1)],
    });

    const row = response.rows[0];
    return row ? mapSiteSettings(row) : null;
  } catch (error) {
    throw new SettingsRepositoryError("تعذر تحميل إعدادات الموقع. تحقق من الاتصال أو الصلاحيات.", "READ_FAILED", error);
  }
}

export async function upsertSiteSettings(restaurantId: string, input: SiteSettingsMutationInput): Promise<SiteSettings> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  const data = toSiteSettingsRowData(input);

  try {
    const existing = await databases.listRows<SiteSettingsRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.siteSettings,
      queries: [Query.equal("restaurantId", restaurantId), Query.limit(1)],
    });

    const existingRow = existing.rows[0];

    if (existingRow) {
      if (existingRow.restaurantId !== restaurantId) {
        throw new SettingsRepositoryError("لا يمكن تعديل إعدادات خارج نطاق المطعم الحالي.", "INVALID_INPUT");
      }

      const row = await databases.updateRow<SiteSettingsRow>({
        databaseId: DATABASE_ID,
        tableId: TABLES.siteSettings,
        rowId: existingRow.$id,
        data,
      });

      return mapSiteSettings(row);
    }

    const row = await databases.createRow<SiteSettingsRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.siteSettings,
      rowId: ID.unique(),
      data: {
        ...data,
        restaurantId,
      } satisfies SiteSettingsCreateRowData,
    });

    return mapSiteSettings(row);
  } catch (error) {
    if (error instanceof SettingsRepositoryError) {
      throw error;
    }

    throw new SettingsRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}
