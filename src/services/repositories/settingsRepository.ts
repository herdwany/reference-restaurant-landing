import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type {
  BackgroundStyle,
  ButtonStyle,
  CardStyle,
  FontPreset,
  FooterStyle,
  HeaderStyle,
  HeroLayoutPreset,
  HeroMediaType,
  OrderMode,
  ReservationMode,
  SectionSpacing,
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
  deliveryEnabled?: boolean | null;
  pickupEnabled?: boolean | null;
  deliveryBaseFee?: number | null;
  freeDeliveryThreshold?: number | null;
  minimumOrderAmount?: number | null;
  estimatedDeliveryMinutes?: string | null;
  deliveryAreas?: string | null;
  deliveryInstructions?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  primaryCtaText?: string | null;
  secondaryCtaText?: string | null;
  heroMediaType?: HeroMediaType | null;
  heroImageUrl?: string | null;
  heroVideoUrl?: string | null;
  heroLayout?: HeroLayoutPreset | null;
  themePreset?: ThemePreset | null;
  fontPreset?: FontPreset | null;
  cardStyle?: CardStyle | null;
  buttonStyle?: ButtonStyle | null;
  headerStyle?: HeaderStyle | null;
  footerStyle?: FooterStyle | null;
  sectionSpacing?: SectionSpacing | null;
  backgroundStyle?: BackgroundStyle | null;
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
  hideCompletedOrdersFromMainList?: boolean | null;
  hideCancelledOrdersFromMainList?: boolean | null;
  showPastReservationsInSeparateTab?: boolean | null;
  enableManualArchiveActions?: boolean | null;
  autoArchiveCompletedOrders?: boolean | null;
  orderAutoArchiveAfterHours?: number | null;
  autoArchiveCompletedReservations?: boolean | null;
  reservationAutoArchiveAfterHours?: number | null;
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
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryBaseFee?: number;
  freeDeliveryThreshold?: number;
  minimumOrderAmount?: number;
  estimatedDeliveryMinutes?: string;
  deliveryAreas?: string;
  deliveryInstructions?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  heroMediaType?: HeroMediaType;
  heroImageUrl?: string;
  heroVideoUrl?: string;
  heroLayout?: HeroLayoutPreset;
  themePreset?: ThemePreset;
  fontPreset?: FontPreset;
  cardStyle?: CardStyle;
  buttonStyle?: ButtonStyle;
  headerStyle?: HeaderStyle;
  footerStyle?: FooterStyle;
  sectionSpacing?: SectionSpacing;
  backgroundStyle?: BackgroundStyle;
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
  hideCompletedOrdersFromMainList?: boolean;
  hideCancelledOrdersFromMainList?: boolean;
  showPastReservationsInSeparateTab?: boolean;
  enableManualArchiveActions?: boolean;
  autoArchiveCompletedOrders?: boolean;
  orderAutoArchiveAfterHours?: number;
  autoArchiveCompletedReservations?: boolean;
  reservationAutoArchiveAfterHours?: number;
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
  deliveryEnabled: row.deliveryEnabled ?? undefined,
  pickupEnabled: row.pickupEnabled ?? undefined,
  deliveryBaseFee: row.deliveryBaseFee ?? undefined,
  freeDeliveryThreshold: row.freeDeliveryThreshold ?? undefined,
  minimumOrderAmount: row.minimumOrderAmount ?? undefined,
  estimatedDeliveryMinutes: row.estimatedDeliveryMinutes ?? undefined,
  deliveryAreas: row.deliveryAreas ?? undefined,
  deliveryInstructions: row.deliveryInstructions ?? undefined,
  heroTitle: row.heroTitle ?? undefined,
  heroSubtitle: row.heroSubtitle ?? undefined,
  primaryCtaText: row.primaryCtaText ?? undefined,
  secondaryCtaText: row.secondaryCtaText ?? undefined,
  heroMediaType: row.heroMediaType ?? undefined,
  heroImageUrl: row.heroImageUrl ?? undefined,
  heroVideoUrl: row.heroVideoUrl ?? undefined,
  heroLayout: row.heroLayout ?? undefined,
  themePreset: row.themePreset ?? undefined,
  fontPreset: row.fontPreset ?? undefined,
  cardStyle: row.cardStyle ?? undefined,
  buttonStyle: row.buttonStyle ?? undefined,
  headerStyle: row.headerStyle ?? undefined,
  footerStyle: row.footerStyle ?? undefined,
  sectionSpacing: row.sectionSpacing ?? undefined,
  backgroundStyle: row.backgroundStyle ?? undefined,
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
  hideCompletedOrdersFromMainList: row.hideCompletedOrdersFromMainList ?? undefined,
  hideCancelledOrdersFromMainList: row.hideCancelledOrdersFromMainList ?? undefined,
  showPastReservationsInSeparateTab: row.showPastReservationsInSeparateTab ?? undefined,
  enableManualArchiveActions: row.enableManualArchiveActions ?? undefined,
  autoArchiveCompletedOrders: row.autoArchiveCompletedOrders ?? undefined,
  orderAutoArchiveAfterHours: row.orderAutoArchiveAfterHours ?? undefined,
  autoArchiveCompletedReservations: row.autoArchiveCompletedReservations ?? undefined,
  reservationAutoArchiveAfterHours: row.reservationAutoArchiveAfterHours ?? undefined,
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
  deliveryEnabled: input.deliveryEnabled ?? true,
  pickupEnabled: Boolean(input.pickupEnabled),
  deliveryBaseFee: input.deliveryBaseFee,
  freeDeliveryThreshold: input.freeDeliveryThreshold,
  minimumOrderAmount: input.minimumOrderAmount,
  estimatedDeliveryMinutes: input.estimatedDeliveryMinutes?.trim() || undefined,
  deliveryAreas: input.deliveryAreas?.trim() || undefined,
  deliveryInstructions: input.deliveryInstructions?.trim() || undefined,
  heroTitle: input.heroTitle?.trim() || undefined,
  heroSubtitle: input.heroSubtitle?.trim() || undefined,
  primaryCtaText: input.primaryCtaText?.trim() || undefined,
  secondaryCtaText: input.secondaryCtaText?.trim() || undefined,
  heroMediaType: input.heroMediaType || "image",
  heroImageUrl: input.heroImageUrl?.trim() || undefined,
  heroVideoUrl: input.heroVideoUrl?.trim() || undefined,
  heroLayout: input.heroLayout || "split",
  themePreset: input.themePreset || "classic_red",
  fontPreset: input.fontPreset || "modern",
  cardStyle: input.cardStyle || "soft",
  buttonStyle: input.buttonStyle || "rounded",
  headerStyle: input.headerStyle || "clean",
  footerStyle: input.footerStyle || "dark",
  sectionSpacing: input.sectionSpacing || "normal",
  backgroundStyle: input.backgroundStyle || "warm",
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
  hideCompletedOrdersFromMainList: input.hideCompletedOrdersFromMainList ?? true,
  hideCancelledOrdersFromMainList: input.hideCancelledOrdersFromMainList ?? true,
  showPastReservationsInSeparateTab: input.showPastReservationsInSeparateTab ?? true,
  enableManualArchiveActions: input.enableManualArchiveActions ?? true,
  // TODO: Scheduled auto archive requires a dedicated Appwrite Scheduled Function later.
  autoArchiveCompletedOrders: Boolean(input.autoArchiveCompletedOrders),
  orderAutoArchiveAfterHours: input.orderAutoArchiveAfterHours,
  autoArchiveCompletedReservations: Boolean(input.autoArchiveCompletedReservations),
  reservationAutoArchiveAfterHours: input.reservationAutoArchiveAfterHours,
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
