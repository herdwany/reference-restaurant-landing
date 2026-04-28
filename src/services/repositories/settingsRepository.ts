import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type {
  HeroLayoutPreset,
  HeroMediaType,
  OrderMode,
  ReservationMode,
  SiteDirection,
  SiteSettings,
  ThemePreset,
} from "../../types/platform";

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
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  primaryCtaText?: string | null;
  secondaryCtaText?: string | null;
  heroMediaType?: HeroMediaType | null;
  heroImageUrl?: string | null;
  heroVideoUrl?: string | null;
  heroLayout?: HeroLayoutPreset | null;
  themePreset?: ThemePreset | null;
  featuredSectionTitle?: string | null;
  offersSectionTitle?: string | null;
  gallerySectionTitle?: string | null;
  testimonialsSectionTitle?: string | null;
  contactSectionTitle?: string | null;
  faqSectionTitle?: string | null;
  translations?: string | null;
  requireManualReservationConfirmation?: boolean | null;
  requireDepositForLargeGroups?: boolean | null;
  depositThresholdPeople?: number | null;
  depositAmount?: number | null;
  depositPolicyText?: string | null;
  cancellationPolicyText?: string | null;
  maxPeoplePerReservation?: number | null;
  showHero: boolean;
  showFeatured?: boolean | null;
  showTrustBadges: boolean;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showContact?: boolean | null;
  showFaq: boolean;
  showFooter: boolean;
}

export type SiteSettingsMutationInput = {
  currency: string;
  language: string;
  direction: SiteDirection;
  orderMode: OrderMode;
  reservationMode: ReservationMode;
  heroTitle?: string;
  heroSubtitle?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  heroMediaType?: HeroMediaType;
  heroImageUrl?: string;
  heroVideoUrl?: string;
  heroLayout?: HeroLayoutPreset;
  themePreset?: ThemePreset;
  featuredSectionTitle?: string;
  offersSectionTitle?: string;
  gallerySectionTitle?: string;
  testimonialsSectionTitle?: string;
  contactSectionTitle?: string;
  faqSectionTitle?: string;
  translations?: string;
  requireManualReservationConfirmation?: boolean;
  requireDepositForLargeGroups?: boolean;
  depositThresholdPeople?: number;
  depositAmount?: number;
  depositPolicyText?: string;
  cancellationPolicyText?: string;
  maxPeoplePerReservation?: number;
  showHero: boolean;
  showFeatured?: boolean;
  showTrustBadges: boolean;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showContact?: boolean;
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
  heroTitle: row.heroTitle ?? undefined,
  heroSubtitle: row.heroSubtitle ?? undefined,
  primaryCtaText: row.primaryCtaText ?? undefined,
  secondaryCtaText: row.secondaryCtaText ?? undefined,
  heroMediaType: row.heroMediaType ?? undefined,
  heroImageUrl: row.heroImageUrl ?? undefined,
  heroVideoUrl: row.heroVideoUrl ?? undefined,
  heroLayout: row.heroLayout ?? undefined,
  themePreset: row.themePreset ?? undefined,
  featuredSectionTitle: row.featuredSectionTitle ?? undefined,
  offersSectionTitle: row.offersSectionTitle ?? undefined,
  gallerySectionTitle: row.gallerySectionTitle ?? undefined,
  testimonialsSectionTitle: row.testimonialsSectionTitle ?? undefined,
  contactSectionTitle: row.contactSectionTitle ?? undefined,
  faqSectionTitle: row.faqSectionTitle ?? undefined,
  translations: row.translations ?? undefined,
  requireManualReservationConfirmation: row.requireManualReservationConfirmation ?? undefined,
  requireDepositForLargeGroups: row.requireDepositForLargeGroups ?? undefined,
  depositThresholdPeople: row.depositThresholdPeople ?? undefined,
  depositAmount: row.depositAmount ?? undefined,
  depositPolicyText: row.depositPolicyText ?? undefined,
  cancellationPolicyText: row.cancellationPolicyText ?? undefined,
  maxPeoplePerReservation: row.maxPeoplePerReservation ?? undefined,
  showHero: row.showHero,
  showFeatured: row.showFeatured ?? undefined,
  showTrustBadges: row.showTrustBadges,
  showFeaturedDishes: row.showFeaturedDishes,
  showOffers: row.showOffers,
  showGallery: row.showGallery,
  showTestimonials: row.showTestimonials,
  showActionGrid: row.showActionGrid,
  showContact: row.showContact ?? undefined,
  showFaq: row.showFaq,
  showFooter: row.showFooter,
});

const toSiteSettingsRowData = (input: SiteSettingsMutationInput): SiteSettingsRowData => ({
  currency: input.currency.trim() || "د.م",
  language: input.language.trim() || "ar",
  direction: input.direction,
  orderMode: input.orderMode,
  reservationMode: input.reservationMode,
  heroTitle: input.heroTitle?.trim() || undefined,
  heroSubtitle: input.heroSubtitle?.trim() || undefined,
  primaryCtaText: input.primaryCtaText?.trim() || undefined,
  secondaryCtaText: input.secondaryCtaText?.trim() || undefined,
  heroMediaType: input.heroMediaType || "image",
  heroImageUrl: input.heroImageUrl?.trim() || undefined,
  heroVideoUrl: input.heroVideoUrl?.trim() || undefined,
  heroLayout: input.heroLayout || "split",
  themePreset: input.themePreset || "classic_red",
  featuredSectionTitle: input.featuredSectionTitle?.trim() || undefined,
  offersSectionTitle: input.offersSectionTitle?.trim() || undefined,
  gallerySectionTitle: input.gallerySectionTitle?.trim() || undefined,
  testimonialsSectionTitle: input.testimonialsSectionTitle?.trim() || undefined,
  contactSectionTitle: input.contactSectionTitle?.trim() || undefined,
  faqSectionTitle: input.faqSectionTitle?.trim() || undefined,
  translations: input.translations?.trim() || undefined,
  requireManualReservationConfirmation: Boolean(input.requireManualReservationConfirmation),
  requireDepositForLargeGroups: Boolean(input.requireDepositForLargeGroups),
  depositThresholdPeople: input.depositThresholdPeople,
  depositAmount: input.depositAmount,
  depositPolicyText: input.depositPolicyText?.trim() || undefined,
  cancellationPolicyText: input.cancellationPolicyText?.trim() || undefined,
  maxPeoplePerReservation: input.maxPeoplePerReservation,
  showHero: input.showHero,
  showFeatured: input.showFeatured ?? input.showFeaturedDishes,
  showTrustBadges: input.showTrustBadges,
  showFeaturedDishes: input.showFeaturedDishes,
  showOffers: input.showOffers,
  showGallery: input.showGallery,
  showTestimonials: input.showTestimonials,
  showActionGrid: input.showActionGrid,
  showContact: input.showContact ?? input.showActionGrid,
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
