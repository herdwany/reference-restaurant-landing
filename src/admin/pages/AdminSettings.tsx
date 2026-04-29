import { FormEvent, useCallback, useEffect, useState } from "react";
import { Archive, ImageIcon, RefreshCw, Save, Settings } from "lucide-react";
import AdminActionButton from "../components/AdminActionButton";
import AdminCard from "../components/AdminCard";
import AdminErrorState from "../components/AdminErrorState";
import AdminImageUploader from "../components/AdminImageUploader";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminPageHeader from "../components/AdminPageHeader";
import { useActiveRestaurantScope } from "../hooks/useActiveRestaurantScope";
import { useAuditLogger } from "../hooks/useAuditLogger";
import { useAuth } from "../../context/AuthContext";
import { defaultRestaurantConfig } from "../../data/restaurantConfig";
import { canCurrentUserBypassFeatureGate } from "../../lib/featureAccess";
import { mapKnownErrorToFriendlyMessage } from "../../lib/friendlyErrors";
import { useI18n } from "../../lib/i18n/I18nContext";
import { parseTranslationString, stringifyTranslations } from "../../lib/i18n/localizedContent";
import {
  getRestaurantById,
  updateRestaurantContact,
  type RestaurantContactInput,
} from "../../services/repositories/restaurantRepository";
import {
  getSiteSettings,
  upsertSiteSettings,
  type SiteSettingsMutationInput,
} from "../../services/repositories/settingsRepository";
import { getFileViewUrl } from "../../services/appwrite/storageService";
import type {
  HeroLayoutPreset,
  HeroMediaType,
  OrderMode,
  ReservationMode,
  Restaurant,
  SiteDirection,
  SiteSettings,
  ThemePreset,
} from "../../types/platform";

type SettingsFormValues = {
  name: string;
  nameAr: string;
  tagline: string;
  description: string;
  logoFileId: string;
  logoPreviewUrl: string;
  heroImageFileId: string;
  heroImageUrl: string;
  heroPreviewUrl: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  mapsUrl: string;
  workingHours: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  currency: string;
  language: string;
  direction: SiteDirection;
  orderMode: OrderMode;
  reservationMode: ReservationMode;
  heroTitle: string;
  heroSubtitle: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  heroMediaType: HeroMediaType;
  heroVideoUrl: string;
  heroLayout: HeroLayoutPreset;
  themePreset: ThemePreset;
  featuredSectionTitle: string;
  offersSectionTitle: string;
  gallerySectionTitle: string;
  testimonialsSectionTitle: string;
  contactSectionTitle: string;
  faqSectionTitle: string;
  translations: HomepageTranslations;
  requireManualReservationConfirmation: boolean;
  requireDepositForLargeGroups: boolean;
  depositThresholdPeople: string;
  depositAmount: string;
  depositPolicyText: string;
  cancellationPolicyText: string;
  maxPeoplePerReservation: string;
  hideCompletedOrdersFromMainList: boolean;
  hideCancelledOrdersFromMainList: boolean;
  showPastReservationsInSeparateTab: boolean;
  enableManualArchiveActions: boolean;
  autoArchiveCompletedOrders: boolean;
  orderAutoArchiveAfterHours: string;
  autoArchiveCompletedReservations: boolean;
  reservationAutoArchiveAfterHours: string;
  showHero: boolean;
  showTrustBadges: boolean;
  showFeatured: boolean;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showContact: boolean;
  showFaq: boolean;
  showFooter: boolean;
};

type SettingsFormErrors = Partial<Record<keyof SettingsFormValues, string>>;
type HomepageTranslationLanguage = "fr" | "en";
type HomepageTranslationField =
  | "heroTitle"
  | "heroSubtitle"
  | "primaryCtaText"
  | "secondaryCtaText"
  | "featuredSectionTitle"
  | "offersSectionTitle"
  | "gallerySectionTitle"
  | "testimonialsSectionTitle"
  | "contactSectionTitle"
  | "faqSectionTitle"
  | "depositPolicyText"
  | "cancellationPolicyText";
type HomepageTranslations = Record<HomepageTranslationLanguage, Record<HomepageTranslationField, string>>;
type Translate = ReturnType<typeof useI18n>["t"];

const orderModes = ["whatsapp", "database", "both"] as const satisfies readonly OrderMode[];
const reservationModes = ["whatsapp", "database", "both"] as const satisfies readonly ReservationMode[];
const directions = ["rtl", "ltr"] as const satisfies readonly SiteDirection[];
const heroMediaTypes = ["image", "video_url"] as const satisfies readonly HeroMediaType[];
const heroLayouts = ["split", "background", "centered"] as const satisfies readonly HeroLayoutPreset[];
const themePresets = ["classic_red", "black_gold", "coffee", "fresh", "minimal"] as const satisfies readonly ThemePreset[];
const homepageTranslationLanguages = ["fr", "en"] as const satisfies readonly HomepageTranslationLanguage[];
const homepageTranslationFields = [
  "heroTitle",
  "heroSubtitle",
  "primaryCtaText",
  "secondaryCtaText",
  "featuredSectionTitle",
  "offersSectionTitle",
  "gallerySectionTitle",
  "testimonialsSectionTitle",
  "contactSectionTitle",
  "faqSectionTitle",
  "depositPolicyText",
  "cancellationPolicyText",
] as const satisfies readonly HomepageTranslationField[];

const emptyHomepageTranslations = homepageTranslationLanguages.reduce((translations, language) => {
  translations[language] = homepageTranslationFields.reduce(
    (fields, field) => ({
      ...fields,
      [field]: "",
    }),
    {} as Record<HomepageTranslationField, string>,
  );

  return translations;
}, {} as HomepageTranslations);


const cloneEmptyHomepageTranslations = (): HomepageTranslations => ({
  fr: { ...emptyHomepageTranslations.fr },
  en: { ...emptyHomepageTranslations.en },
});

const getHomepageTranslations = (value: string | undefined): HomepageTranslations => {
  const parsed = parseTranslationString(value);
  const nextTranslations = cloneEmptyHomepageTranslations();

  for (const language of homepageTranslationLanguages) {
    for (const field of homepageTranslationFields) {
      nextTranslations[language][field] = String(parsed[language]?.[field] ?? "");
    }
  }

  return nextTranslations;
};

const hasHomepageTranslationsChanged = (current: SettingsFormValues, persisted: SettingsFormValues) =>
  JSON.stringify(current.translations) !== JSON.stringify(persisted.translations);


const emptySettingsFormValues: SettingsFormValues = {
  name: defaultRestaurantConfig.restaurant.name,
  nameAr: defaultRestaurantConfig.restaurant.name,
  tagline: defaultRestaurantConfig.restaurant.slogan,
  description: defaultRestaurantConfig.ui.footer.description,
  logoFileId: "",
  logoPreviewUrl: "",
  heroImageFileId: "",
  heroImageUrl: "",
  heroPreviewUrl: "",
  phone: defaultRestaurantConfig.restaurant.phone,
  whatsappNumber: defaultRestaurantConfig.restaurant.whatsappNumber,
  email: defaultRestaurantConfig.restaurant.email,
  address: defaultRestaurantConfig.restaurant.address,
  mapsUrl: defaultRestaurantConfig.restaurant.mapUrl,
  workingHours: defaultRestaurantConfig.restaurant.workingHours,
  primaryColor: defaultRestaurantConfig.brand.primaryColor,
  secondaryColor: defaultRestaurantConfig.brand.secondaryColor,
  accentColor: defaultRestaurantConfig.brand.accentColor,
  successColor: defaultRestaurantConfig.brand.successColor,
  currency: defaultRestaurantConfig.restaurant.currency || "د.م",
  language: "ar",
  direction: "rtl",
  orderMode: "whatsapp",
  reservationMode: "whatsapp",
  heroTitle: defaultRestaurantConfig.hero.title,
  heroSubtitle: defaultRestaurantConfig.hero.subtitle,
  primaryCtaText: defaultRestaurantConfig.hero.primaryCtaText,
  secondaryCtaText: defaultRestaurantConfig.hero.secondaryCtaText,
  heroMediaType: "image",
  heroVideoUrl: "",
  heroLayout: defaultRestaurantConfig.hero.layout ?? "split",
  themePreset: defaultRestaurantConfig.settings.themePreset ?? "classic_red",
  featuredSectionTitle: defaultRestaurantConfig.ui.sectionTitles.featuredDishes,
  offersSectionTitle: defaultRestaurantConfig.ui.sectionTitles.offers,
  gallerySectionTitle: defaultRestaurantConfig.ui.sectionTitles.gallery,
  testimonialsSectionTitle: defaultRestaurantConfig.ui.sectionTitles.testimonials,
  contactSectionTitle: defaultRestaurantConfig.ui.sectionTitles.actionGrid,
  faqSectionTitle: defaultRestaurantConfig.ui.sectionTitles.faq,
  translations: cloneEmptyHomepageTranslations(),
  requireManualReservationConfirmation: defaultRestaurantConfig.settings.requireManualReservationConfirmation ?? false,
  requireDepositForLargeGroups: defaultRestaurantConfig.settings.requireDepositForLargeGroups ?? false,
  depositThresholdPeople: String(defaultRestaurantConfig.settings.depositThresholdPeople ?? ""),
  depositAmount: String(defaultRestaurantConfig.settings.depositAmount ?? ""),
  depositPolicyText: defaultRestaurantConfig.settings.depositPolicyText ?? "",
  cancellationPolicyText: defaultRestaurantConfig.settings.cancellationPolicyText ?? "",
  maxPeoplePerReservation: String(defaultRestaurantConfig.settings.maxPeoplePerReservation ?? ""),
  hideCompletedOrdersFromMainList: true,
  hideCancelledOrdersFromMainList: true,
  showPastReservationsInSeparateTab: true,
  enableManualArchiveActions: true,
  autoArchiveCompletedOrders: false,
  orderAutoArchiveAfterHours: "",
  autoArchiveCompletedReservations: false,
  reservationAutoArchiveAfterHours: "",
  showHero: defaultRestaurantConfig.settings.sections.hero,
  showTrustBadges: defaultRestaurantConfig.settings.sections.trustBadges,
  showFeatured: defaultRestaurantConfig.settings.sections.featuredDishes,
  showFeaturedDishes: defaultRestaurantConfig.settings.sections.featuredDishes,
  showOffers: defaultRestaurantConfig.settings.sections.offers,
  showGallery: defaultRestaurantConfig.settings.sections.gallery,
  showTestimonials: defaultRestaurantConfig.settings.sections.testimonials,
  showActionGrid: defaultRestaurantConfig.settings.sections.actionGrid,
  showContact: defaultRestaurantConfig.settings.sections.actionGrid,
  showFaq: defaultRestaurantConfig.settings.sections.faq,
  showFooter: defaultRestaurantConfig.settings.sections.footer,
};

const getStoredFileUrl = (fileId: string | undefined) => {
  if (!fileId) {
    return "";
  }

  try {
    return getFileViewUrl(fileId);
  } catch {
    return "";
  }
};

const getSettingsFormValues = (restaurant: Restaurant | null, settings: SiteSettings | null): SettingsFormValues => {
  const restaurantName = restaurant?.name || restaurant?.nameAr || emptySettingsFormValues.name;
  const restaurantNameAr = restaurant?.nameAr || restaurantName;
  const logoFileId = restaurant?.logoFileId ?? "";
  const heroImageFileId = restaurant?.heroImageFileId ?? "";

  return {
    name: restaurantName,
    nameAr: restaurantNameAr,
    tagline: restaurant?.tagline ?? emptySettingsFormValues.tagline,
    description: restaurant?.description ?? emptySettingsFormValues.description,
    logoFileId,
    logoPreviewUrl: getStoredFileUrl(logoFileId),
    heroImageFileId,
    heroImageUrl: restaurant?.heroImageUrl ?? settings?.heroImageUrl ?? emptySettingsFormValues.heroImageUrl,
    heroPreviewUrl: getStoredFileUrl(heroImageFileId),
    phone: restaurant?.phone ?? emptySettingsFormValues.phone,
    whatsappNumber: restaurant?.whatsappNumber ?? emptySettingsFormValues.whatsappNumber,
    email: restaurant?.email ?? emptySettingsFormValues.email,
    address: restaurant?.address ?? emptySettingsFormValues.address,
    mapsUrl: restaurant?.mapsUrl ?? emptySettingsFormValues.mapsUrl,
    workingHours: restaurant?.workingHours ?? emptySettingsFormValues.workingHours,
    primaryColor: restaurant?.primaryColor ?? emptySettingsFormValues.primaryColor,
    secondaryColor: restaurant?.secondaryColor ?? emptySettingsFormValues.secondaryColor,
    accentColor: restaurant?.accentColor ?? emptySettingsFormValues.accentColor,
    successColor: restaurant?.successColor ?? emptySettingsFormValues.successColor,
    currency: settings?.currency ?? emptySettingsFormValues.currency,
    language: settings?.language ?? emptySettingsFormValues.language,
    direction: settings?.direction ?? emptySettingsFormValues.direction,
    orderMode: settings?.orderMode ?? emptySettingsFormValues.orderMode,
    reservationMode: settings?.reservationMode ?? emptySettingsFormValues.reservationMode,
    heroTitle: settings?.heroTitle ?? emptySettingsFormValues.heroTitle,
    heroSubtitle: settings?.heroSubtitle ?? restaurant?.description ?? emptySettingsFormValues.heroSubtitle,
    primaryCtaText: settings?.primaryCtaText ?? emptySettingsFormValues.primaryCtaText,
    secondaryCtaText: settings?.secondaryCtaText ?? emptySettingsFormValues.secondaryCtaText,
    heroMediaType: settings?.heroMediaType ?? emptySettingsFormValues.heroMediaType,
    heroVideoUrl: settings?.heroVideoUrl ?? emptySettingsFormValues.heroVideoUrl,
    heroLayout: settings?.heroLayout ?? emptySettingsFormValues.heroLayout,
    themePreset: settings?.themePreset ?? emptySettingsFormValues.themePreset,
    featuredSectionTitle: settings?.featuredSectionTitle ?? emptySettingsFormValues.featuredSectionTitle,
    offersSectionTitle: settings?.offersSectionTitle ?? emptySettingsFormValues.offersSectionTitle,
    gallerySectionTitle: settings?.gallerySectionTitle ?? emptySettingsFormValues.gallerySectionTitle,
    testimonialsSectionTitle: settings?.testimonialsSectionTitle ?? emptySettingsFormValues.testimonialsSectionTitle,
    contactSectionTitle: settings?.contactSectionTitle ?? emptySettingsFormValues.contactSectionTitle,
    faqSectionTitle: settings?.faqSectionTitle ?? emptySettingsFormValues.faqSectionTitle,
    translations: getHomepageTranslations(settings?.translations),
    requireManualReservationConfirmation:
      settings?.requireManualReservationConfirmation ?? emptySettingsFormValues.requireManualReservationConfirmation,
    requireDepositForLargeGroups: settings?.requireDepositForLargeGroups ?? emptySettingsFormValues.requireDepositForLargeGroups,
    depositThresholdPeople:
      typeof settings?.depositThresholdPeople === "number"
        ? String(settings.depositThresholdPeople)
        : emptySettingsFormValues.depositThresholdPeople,
    depositAmount:
      typeof settings?.depositAmount === "number" ? String(settings.depositAmount) : emptySettingsFormValues.depositAmount,
    depositPolicyText: settings?.depositPolicyText ?? emptySettingsFormValues.depositPolicyText,
    cancellationPolicyText: settings?.cancellationPolicyText ?? emptySettingsFormValues.cancellationPolicyText,
    maxPeoplePerReservation:
      typeof settings?.maxPeoplePerReservation === "number"
        ? String(settings.maxPeoplePerReservation)
        : emptySettingsFormValues.maxPeoplePerReservation,
    hideCompletedOrdersFromMainList:
      settings?.hideCompletedOrdersFromMainList ?? emptySettingsFormValues.hideCompletedOrdersFromMainList,
    hideCancelledOrdersFromMainList:
      settings?.hideCancelledOrdersFromMainList ?? emptySettingsFormValues.hideCancelledOrdersFromMainList,
    showPastReservationsInSeparateTab:
      settings?.showPastReservationsInSeparateTab ?? emptySettingsFormValues.showPastReservationsInSeparateTab,
    enableManualArchiveActions: settings?.enableManualArchiveActions ?? emptySettingsFormValues.enableManualArchiveActions,
    autoArchiveCompletedOrders: settings?.autoArchiveCompletedOrders ?? emptySettingsFormValues.autoArchiveCompletedOrders,
    orderAutoArchiveAfterHours:
      typeof settings?.orderAutoArchiveAfterHours === "number"
        ? String(settings.orderAutoArchiveAfterHours)
        : emptySettingsFormValues.orderAutoArchiveAfterHours,
    autoArchiveCompletedReservations:
      settings?.autoArchiveCompletedReservations ?? emptySettingsFormValues.autoArchiveCompletedReservations,
    reservationAutoArchiveAfterHours:
      typeof settings?.reservationAutoArchiveAfterHours === "number"
        ? String(settings.reservationAutoArchiveAfterHours)
        : emptySettingsFormValues.reservationAutoArchiveAfterHours,
    showHero: settings?.showHero ?? emptySettingsFormValues.showHero,
    showTrustBadges: settings?.showTrustBadges ?? emptySettingsFormValues.showTrustBadges,
    showFeatured: settings?.showFeatured ?? settings?.showFeaturedDishes ?? emptySettingsFormValues.showFeatured,
    showFeaturedDishes: settings?.showFeaturedDishes ?? emptySettingsFormValues.showFeaturedDishes,
    showOffers: settings?.showOffers ?? emptySettingsFormValues.showOffers,
    showGallery: settings?.showGallery ?? emptySettingsFormValues.showGallery,
    showTestimonials: settings?.showTestimonials ?? emptySettingsFormValues.showTestimonials,
    showActionGrid: settings?.showActionGrid ?? emptySettingsFormValues.showActionGrid,
    showContact: settings?.showContact ?? settings?.showActionGrid ?? emptySettingsFormValues.showContact,
    showFaq: settings?.showFaq ?? emptySettingsFormValues.showFaq,
    showFooter: settings?.showFooter ?? emptySettingsFormValues.showFooter,
  };
};

const isAcceptableUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isAcceptableEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isHexColor = (value: string) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
const parseOptionalPositiveNumber = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : Number.NaN;
};

const brandSettingKeys = [
  "logoFileId",
  "logoPreviewUrl",
  "heroImageFileId",
  "heroImageUrl",
  "heroPreviewUrl",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "successColor",
] as const satisfies readonly (keyof SettingsFormValues)[];

const advancedSettingKeys = [
  "currency",
  "language",
  "direction",
  "orderMode",
  "reservationMode",
] as const satisfies readonly (keyof SettingsFormValues)[];

const proHomepageSettingKeys = [
  "primaryCtaText",
  "secondaryCtaText",
  "featuredSectionTitle",
  "offersSectionTitle",
  "gallerySectionTitle",
  "testimonialsSectionTitle",
  "contactSectionTitle",
  "faqSectionTitle",
  "showHero",
  "showFeatured",
  "showFeaturedDishes",
  "showOffers",
  "showGallery",
  "showTestimonials",
  "showContact",
  "showActionGrid",
  "showFaq",
  "showTrustBadges",
  "showFooter",
] as const satisfies readonly (keyof SettingsFormValues)[];

const reservationSimpleSettingKeys = [
  "maxPeoplePerReservation",
] as const satisfies readonly (keyof SettingsFormValues)[];

const proReservationSettingKeys = [
  "requireManualReservationConfirmation",
  "depositPolicyText",
  "cancellationPolicyText",
] as const satisfies readonly (keyof SettingsFormValues)[];

const depositWorkflowSettingKeys = [
  "requireDepositForLargeGroups",
  "depositThresholdPeople",
  "depositAmount",
] as const satisfies readonly (keyof SettingsFormValues)[];

const archivePreferenceSettingKeys = [
  "hideCompletedOrdersFromMainList",
  "hideCancelledOrdersFromMainList",
  "showPastReservationsInSeparateTab",
  "enableManualArchiveActions",
  "autoArchiveCompletedOrders",
  "orderAutoArchiveAfterHours",
  "autoArchiveCompletedReservations",
  "reservationAutoArchiveAfterHours",
] as const satisfies readonly (keyof SettingsFormValues)[];

const advancedHomepageSettingKeys = [
  "heroMediaType",
  "heroVideoUrl",
  "heroLayout",
  "themePreset",
] as const satisfies readonly (keyof SettingsFormValues)[];

const hasChangedFields = (
  keys: readonly (keyof SettingsFormValues)[],
  current: SettingsFormValues,
  persisted: SettingsFormValues,
) => keys.some((key) => current[key] !== persisted[key]);

const validateSettingsForm = (
  values: SettingsFormValues,
  options: {
    canSaveAdvancedTheme: boolean;
    canSaveArchivePreferences: boolean;
    canSaveBrand: boolean;
    canSaveDepositWorkflow: boolean;
    canSaveReservationPolicies: boolean;
  },
  t: Translate,
): SettingsFormErrors => {
  const errors: SettingsFormErrors = {};

  if (!values.name.trim() && !values.nameAr.trim()) {
    errors.nameAr = t("requiredField");
  }

  if (!values.whatsappNumber.trim()) {
    errors.whatsappNumber = t("requiredField");
  }

  if (values.email.trim() && !isAcceptableEmail(values.email.trim())) {
    errors.email = t("invalidValue");
  }

  if (values.mapsUrl.trim() && !isAcceptableUrl(values.mapsUrl.trim())) {
    errors.mapsUrl = t("invalidValue");
  }

  if (options.canSaveBrand && values.heroImageUrl.trim() && !isAcceptableUrl(values.heroImageUrl.trim())) {
    errors.heroImageUrl = t("invalidValue");
  }

  if (options.canSaveBrand) {
    for (const colorKey of ["primaryColor", "secondaryColor", "accentColor", "successColor"] as const) {
      if (values[colorKey].trim() && !isHexColor(values[colorKey].trim())) {
        errors[colorKey] = t("invalidValue");
      }
    }
  }

  if (options.canSaveAdvancedTheme) {
    if (!directions.includes(values.direction)) {
      errors.direction = t("invalidValue");
    }

    if (!orderModes.includes(values.orderMode)) {
      errors.orderMode = t("invalidValue");
    }

    if (!reservationModes.includes(values.reservationMode)) {
      errors.reservationMode = t("invalidValue");
    }

    if (!heroMediaTypes.includes(values.heroMediaType)) {
      errors.heroMediaType = t("invalidValue");
    }

    if (values.heroVideoUrl.trim() && !isAcceptableUrl(values.heroVideoUrl.trim())) {
      errors.heroVideoUrl = t("invalidValue");
    }

    if (!heroLayouts.includes(values.heroLayout)) {
      errors.heroLayout = t("invalidValue");
    }

    if (!themePresets.includes(values.themePreset)) {
      errors.themePreset = t("invalidValue");
    }
  }

  const maxPeople = parseOptionalPositiveNumber(values.maxPeoplePerReservation);
  if (values.maxPeoplePerReservation.trim() && !Number.isFinite(maxPeople)) {
    errors.maxPeoplePerReservation = t("invalidValue");
  }

  if (options.canSaveDepositWorkflow) {
    const threshold = parseOptionalPositiveNumber(values.depositThresholdPeople);
    const amount = parseOptionalPositiveNumber(values.depositAmount);

    if (values.depositThresholdPeople.trim() && !Number.isFinite(threshold)) {
      errors.depositThresholdPeople = t("invalidValue");
    }

    if (values.depositAmount.trim() && !Number.isFinite(amount)) {
      errors.depositAmount = t("invalidValue");
    }
  }

  if (options.canSaveArchivePreferences) {
    const orderArchiveHours = parseOptionalPositiveNumber(values.orderAutoArchiveAfterHours);
    const reservationArchiveHours = parseOptionalPositiveNumber(values.reservationAutoArchiveAfterHours);

    if (values.orderAutoArchiveAfterHours.trim() && !Number.isFinite(orderArchiveHours)) {
      errors.orderAutoArchiveAfterHours = t("invalidValue");
    }

    if (values.reservationAutoArchiveAfterHours.trim() && !Number.isFinite(reservationArchiveHours)) {
      errors.reservationAutoArchiveAfterHours = t("invalidValue");
    }
  }

  return errors;
};

const toRestaurantContactInput = (
  values: SettingsFormValues,
  persistedValues: SettingsFormValues,
  canSaveBrand: boolean,
): RestaurantContactInput => ({
  name: values.name.trim(),
  nameAr: values.nameAr.trim(),
  tagline: values.tagline.trim(),
  description: values.description.trim(),
  logoFileId: (canSaveBrand ? values.logoFileId : persistedValues.logoFileId).trim() || undefined,
  heroImageFileId: (canSaveBrand ? values.heroImageFileId : persistedValues.heroImageFileId).trim() || undefined,
  heroImageUrl: (canSaveBrand ? values.heroImageUrl : persistedValues.heroImageUrl).trim() || undefined,
  phone: values.phone.trim(),
  whatsappNumber: values.whatsappNumber.trim(),
  email: values.email.trim() || undefined,
  address: values.address.trim(),
  mapsUrl: values.mapsUrl.trim() || undefined,
  workingHours: values.workingHours.trim(),
  primaryColor: (canSaveBrand ? values.primaryColor : persistedValues.primaryColor).trim(),
  secondaryColor: (canSaveBrand ? values.secondaryColor : persistedValues.secondaryColor).trim(),
  accentColor: (canSaveBrand ? values.accentColor : persistedValues.accentColor).trim(),
  successColor: (canSaveBrand ? values.successColor : persistedValues.successColor).trim(),
});

const toSiteSettingsInput = (values: SettingsFormValues): SiteSettingsMutationInput => ({
  currency: values.currency.trim() || "د.م",
  language: values.language.trim() || "ar",
  direction: values.direction,
  orderMode: values.orderMode,
  reservationMode: values.reservationMode,
  heroTitle: values.heroTitle.trim() || undefined,
  heroSubtitle: values.heroSubtitle.trim() || undefined,
  primaryCtaText: values.primaryCtaText.trim() || undefined,
  secondaryCtaText: values.secondaryCtaText.trim() || undefined,
  heroMediaType: values.heroMediaType,
  heroImageUrl: values.heroImageUrl.trim() || undefined,
  heroVideoUrl: values.heroVideoUrl.trim() || undefined,
  heroLayout: values.heroLayout,
  themePreset: values.themePreset,
  featuredSectionTitle: values.featuredSectionTitle.trim() || undefined,
  offersSectionTitle: values.offersSectionTitle.trim() || undefined,
  gallerySectionTitle: values.gallerySectionTitle.trim() || undefined,
  testimonialsSectionTitle: values.testimonialsSectionTitle.trim() || undefined,
  contactSectionTitle: values.contactSectionTitle.trim() || undefined,
  faqSectionTitle: values.faqSectionTitle.trim() || undefined,
  translations: stringifyTranslations(values.translations),
  requireManualReservationConfirmation: values.requireManualReservationConfirmation,
  requireDepositForLargeGroups: values.requireDepositForLargeGroups,
  depositThresholdPeople: parseOptionalPositiveNumber(values.depositThresholdPeople),
  depositAmount: parseOptionalPositiveNumber(values.depositAmount),
  depositPolicyText: values.depositPolicyText.trim() || undefined,
  cancellationPolicyText: values.cancellationPolicyText.trim() || undefined,
  maxPeoplePerReservation: parseOptionalPositiveNumber(values.maxPeoplePerReservation),
  hideCompletedOrdersFromMainList: values.hideCompletedOrdersFromMainList,
  hideCancelledOrdersFromMainList: values.hideCancelledOrdersFromMainList,
  showPastReservationsInSeparateTab: values.showPastReservationsInSeparateTab,
  enableManualArchiveActions: values.enableManualArchiveActions,
  // TODO: Scheduled auto archive requires a dedicated Appwrite Scheduled Function later.
  autoArchiveCompletedOrders: values.autoArchiveCompletedOrders,
  orderAutoArchiveAfterHours: parseOptionalPositiveNumber(values.orderAutoArchiveAfterHours),
  autoArchiveCompletedReservations: values.autoArchiveCompletedReservations,
  reservationAutoArchiveAfterHours: parseOptionalPositiveNumber(values.reservationAutoArchiveAfterHours),
  showHero: values.showHero,
  showTrustBadges: values.showTrustBadges,
  showFeatured: values.showFeatured,
  showFeaturedDishes: values.showFeatured,
  showOffers: values.showOffers,
  showGallery: values.showGallery,
  showTestimonials: values.showTestimonials,
  showActionGrid: values.showContact,
  showContact: values.showContact,
  showFaq: values.showFaq,
  showFooter: values.showFooter,
});

const mergeAllowedSettingsValues = (
  values: SettingsFormValues,
  persistedValues: SettingsFormValues,
  options: { canSaveArchivePreferences: boolean; canSaveBrand: boolean; canSaveAdvancedTheme: boolean },
): SettingsFormValues => {
  const nextValues = { ...persistedValues };

  nextValues.heroTitle = values.heroTitle;
  nextValues.heroSubtitle = values.heroSubtitle;
  for (const key of reservationSimpleSettingKeys) {
    nextValues[key] = values[key] as never;
  }

  if (options.canSaveBrand) {
    for (const key of proHomepageSettingKeys) {
      nextValues[key] = values[key] as never;
    }
    for (const key of proReservationSettingKeys) {
      nextValues[key] = values[key] as never;
    }
    nextValues.translations = values.translations;
    nextValues.heroImageUrl = values.heroImageUrl;
  }

  if (options.canSaveAdvancedTheme) {
    for (const key of [...advancedSettingKeys, ...advancedHomepageSettingKeys] as const) {
      nextValues[key] = values[key] as never;
    }
    for (const key of depositWorkflowSettingKeys) {
      nextValues[key] = values[key] as never;
    }
  }

  if (options.canSaveArchivePreferences) {
    for (const key of archivePreferenceSettingKeys) {
      nextValues[key] = values[key] as never;
    }
  }

  return nextValues;
};

const getErrorMessage = (error: unknown, t: ReturnType<typeof useI18n>["t"]) => mapKnownErrorToFriendlyMessage(error, t);

export default function AdminSettings() {
  const { t } = useI18n();
  const modeLabels: Record<OrderMode | ReservationMode, string> = {
    whatsapp: t("whatsapp"),
    database: t("orderModeDatabase"),
    both: t("orderModeBoth"),
  };
  const heroMediaTypeLabels: Record<HeroMediaType, string> = {
    image: t("heroMediaImage"),
    video_url: t("heroMediaVideoUrl"),
  };
  const heroLayoutLabels: Record<HeroLayoutPreset, string> = {
    split: t("heroLayoutSplit"),
    background: t("heroLayoutBackground"),
    centered: t("heroLayoutCentered"),
  };
  const themePresetLabels: Record<ThemePreset, string> = {
    classic_red: t("themeClassicRed"),
    black_gold: t("themeBlackGold"),
    coffee: t("themeCoffee"),
    fresh: t("themeFresh"),
    minimal: t("themeMinimal"),
  };
  const directionLabels: Record<SiteDirection, string> = {
    rtl: t("directionRtl"),
    ltr: t("directionLtr"),
  };
  const homepageTranslationLanguageLabels: Record<HomepageTranslationLanguage, string> = {
    fr: t("languageFrench"),
    en: t("languageEnglish"),
  };
  const homepageTranslationLabels: Record<HomepageTranslationField, string> = {
    heroTitle: t("heroTitle"),
    heroSubtitle: t("heroSubtitle"),
    primaryCtaText: t("primaryCtaText"),
    secondaryCtaText: t("secondaryCtaText"),
    featuredSectionTitle: t("featuredDishes"),
    offersSectionTitle: t("offers"),
    gallerySectionTitle: t("gallery"),
    testimonialsSectionTitle: t("testimonials"),
    contactSectionTitle: t("sectionContact"),
    faqSectionTitle: t("faq"),
    depositPolicyText: t("depositPolicyTextLabel"),
    cancellationPolicyText: t("cancellationPolicyTextLabel"),
  };
  const sectionToggles = [
    { key: "showHero", label: t("sectionHero") },
    { key: "showFeatured", label: t("sectionFeaturedDishes") },
    { key: "showOffers", label: t("sectionOffers") },
    { key: "showGallery", label: t("sectionGallery") },
    { key: "showTestimonials", label: t("sectionTestimonials") },
    { key: "showContact", label: t("sectionContact") },
    { key: "showFaq", label: t("sectionFaq") },
  ] as const satisfies readonly {
    key: keyof Pick<
      SettingsFormValues,
      | "showHero"
      | "showFeatured"
      | "showOffers"
      | "showGallery"
      | "showTestimonials"
      | "showContact"
      | "showFaq"
    >; label: string
  }[];
  const colorLabels: Record<"primaryColor" | "secondaryColor" | "accentColor" | "successColor", string> = {
    primaryColor: t("primaryColorLabel"),
    secondaryColor: t("secondaryColorLabel"),
    accentColor: t("accentColorLabel"),
    successColor: t("successColorLabel"),
  };
  const {
    activeRestaurant,
    activeRestaurantId,
    activeRestaurantName,
    canAccessFeature,
    canManageRestaurantContent,
    clientHasFeature,
    role,
    scopeError,
  } = useActiveRestaurantScope();
  const logAction = useAuditLogger();
  const { refreshProfile } = useAuth();
  const isAgencyAdminBypass = canCurrentUserBypassFeatureGate(role);
  const canSaveBrand = canAccessFeature("canCustomizeBrand") || isAgencyAdminBypass;
  const canSaveAdvancedTheme = canAccessFeature("canUseAdvancedTheme") || isAgencyAdminBypass;
  const canSaveReservationPolicies = canSaveBrand;
  const canSaveDepositWorkflow = canSaveAdvancedTheme;
  const canSaveArchivePreferences =
    isAgencyAdminBypass || canAccessFeature("canManageOrders") || canAccessFeature("canManageReservations");
  const clientCanCustomizeBrand = clientHasFeature("canCustomizeBrand");
  const clientCanUseAdvancedTheme = clientHasFeature("canUseAdvancedTheme");
  const initialSettingsFormValues = getSettingsFormValues(activeRestaurant, null);
  const [formValues, setFormValues] = useState<SettingsFormValues>(initialSettingsFormValues);
  const [persistedValues, setPersistedValues] = useState<SettingsFormValues>(initialSettingsFormValues);
  const [formErrors, setFormErrors] = useState<SettingsFormErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!activeRestaurantId) {
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const [restaurant, settings] = await Promise.all([getRestaurantById(activeRestaurantId), getSiteSettings(activeRestaurantId)]);
      const nextValues = getSettingsFormValues(restaurant ?? activeRestaurant, settings);
      setFormValues(nextValues);
      setPersistedValues(nextValues);
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setIsLoading(false);
    }
  }, [activeRestaurant, activeRestaurantId, t]);

  useEffect(() => {
    if (!canManageRestaurantContent || !activeRestaurantId) {
      const nextValues = getSettingsFormValues(activeRestaurant, null);
      setFormValues(nextValues);
      setPersistedValues(nextValues);
      return;
    }

    void loadSettings();
  }, [activeRestaurant, activeRestaurantId, canManageRestaurantContent, loadSettings]);

  const updateFormValue = <Key extends keyof SettingsFormValues>(key: Key, value: SettingsFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateHomepageTranslation = (
    language: HomepageTranslationLanguage,
    field: HomepageTranslationField,
    value: string,
  ) => {
    setFormValues((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [language]: {
          ...current.translations[language],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);
    setSuccessMessage(null);

    const nextErrors = validateSettingsForm(formValues, {
      canSaveAdvancedTheme,
      canSaveArchivePreferences,
      canSaveBrand,
      canSaveDepositWorkflow,
      canSaveReservationPolicies,
    }, t);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!activeRestaurantId) {
      setPageError(t("restaurantScopeMissing"));
      return;
    }

    if (!canSaveBrand && hasChangedFields(brandSettingKeys, formValues, persistedValues)) {
      setPageError(t("featureUnavailable"));
      return;
    }

    if (!canSaveBrand && hasChangedFields(proHomepageSettingKeys, formValues, persistedValues)) {
      setPageError(t("featureUnavailable"));
      return;
    }

    if (!canSaveBrand && hasHomepageTranslationsChanged(formValues, persistedValues)) {
      setPageError(t("featureUnavailable"));
      return;
    }

    if (!canSaveReservationPolicies && hasChangedFields(proReservationSettingKeys, formValues, persistedValues)) {
      setPageError(t("featureUnavailable"));
      return;
    }

    if (!canSaveArchivePreferences && hasChangedFields(archivePreferenceSettingKeys, formValues, persistedValues)) {
      setPageError(t("featureUnavailable"));
      return;
    }

    if (
      !canSaveAdvancedTheme &&
      hasChangedFields([...advancedSettingKeys, ...advancedHomepageSettingKeys, ...depositWorkflowSettingKeys], formValues, persistedValues)
    ) {
      setPageError(t("featureUnavailable"));
      return;
    }

    setIsSaving(true);

    try {
      const savedRestaurant = await updateRestaurantContact(activeRestaurantId, toRestaurantContactInput(formValues, persistedValues, canSaveBrand));
      const allowedSettingsValues = mergeAllowedSettingsValues(formValues, persistedValues, {
        canSaveAdvancedTheme,
        canSaveArchivePreferences,
        canSaveBrand,
      });
      const savedSettings = await upsertSiteSettings(activeRestaurantId, toSiteSettingsInput(allowedSettingsValues));
      const nextValues = getSettingsFormValues(savedRestaurant, savedSettings);

      setFormValues(nextValues);
      setPersistedValues(nextValues);
      logAction({
        action: "contact_update",
        entityType: "settings",
        entityId: savedRestaurant.id,
        metadata: { name: savedRestaurant.nameAr || savedRestaurant.name },
      });
      if (savedSettings) {
        logAction({
          action: "settings_update",
          entityType: "settings",
          entityId: savedSettings.id,
          metadata: {
            direction: savedSettings.direction,
            orderMode: savedSettings.orderMode,
            reservationMode: savedSettings.reservationMode,
          },
        });
      }
      setSuccessMessage(t("settingsSaved"));
      void refreshProfile();
    } catch (error) {
      setPageError(getErrorMessage(error, t));
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldError = (key: keyof SettingsFormValues) => (formErrors[key] ? <small>{formErrors[key]}</small> : null);

  if (scopeError) {
    return (
      <section className="admin-settings-page">
        <AdminPageHeader
          eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
          title={t("settingsTitle")}
          description={t("settingsDescription")}
        />
        <AdminErrorState title={t("settingsTitle")} message={scopeError} />
      </section>
    );
  }

  return (
    <section className="admin-settings-page">
      <AdminPageHeader
        eyebrow={activeRestaurantName || activeRestaurant?.nameAr || activeRestaurant?.name}
        title={t("settingsTitle")}
        description={t("settingsDescription")}
        actions={
          canManageRestaurantContent ? (
            <AdminActionButton
              variant="secondary"
              icon={<RefreshCw size={18} aria-hidden="true" />}
              onClick={() => void loadSettings()}
              disabled={isLoading || isSaving}
            >
              {t("refresh")}
            </AdminActionButton>
          ) : null
        }
      />

      {isLoading ? <AdminLoadingState label={t("loading")} /> : null}

      {!isLoading ? (
        <form className="admin-settings-form" onSubmit={handleSubmit} noValidate>
          {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}
          {pageError ? <div className="admin-feedback admin-feedback--error">{pageError}</div> : null}
          {!canSaveBrand ? (
            <div className="admin-feedback admin-feedback--error">
              {t("brandUpgradeNotice")}
            </div>
          ) : null}
          {isAgencyAdminBypass && (!clientCanCustomizeBrand || !clientCanUseAdvancedTheme) ? (
            <div className="admin-feedback admin-feedback--success">
              {t("agencyBypassNotice")}
            </div>
          ) : null}

          <AdminCard className="admin-settings-section">
            <div className="admin-settings-section__header">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h3>{t("restaurantIdentity")}</h3>
                <p>{t("restaurantIdentityDescription")}</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>{t("restaurantNameArabic")}</span>
                <input value={formValues.nameAr} onChange={(event) => updateFormValue("nameAr", event.target.value)} aria-invalid={Boolean(formErrors.nameAr)} />
                {renderFieldError("nameAr")}
              </label>
              <label>
                <span>{t("restaurantName")}</span>
                <input value={formValues.name} onChange={(event) => updateFormValue("name", event.target.value)} aria-invalid={Boolean(formErrors.name)} />
                {renderFieldError("name")}
              </label>
              <label className="admin-form-grid__wide">
                <span>{t("tagline")}</span>
                <input value={formValues.tagline} onChange={(event) => updateFormValue("tagline", event.target.value)} />
              </label>
              <label className="admin-form-grid__wide">
                <span>{t("restaurantDescription")}</span>
                <textarea value={formValues.description} onChange={(event) => updateFormValue("description", event.target.value)} rows={3} />
              </label>
            </div>
          </AdminCard>

          <AdminCard className="admin-settings-section">
            <div className="admin-settings-section__header">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h3>{t("contactInfo")}</h3>
                <p>{t("contactSectionDescription")}</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>{t("phone")}</span>
                <input value={formValues.phone} onChange={(event) => updateFormValue("phone", event.target.value)} inputMode="tel" />
              </label>
              <label>
                <span>{t("whatsappNumber")}</span>
                <input
                  value={formValues.whatsappNumber}
                  onChange={(event) => updateFormValue("whatsappNumber", event.target.value)}
                  aria-invalid={Boolean(formErrors.whatsappNumber)}
                  inputMode="tel"
                />
                {renderFieldError("whatsappNumber")}
              </label>
              <label>
                <span>{t("email")}</span>
                <input
                  value={formValues.email}
                  onChange={(event) => updateFormValue("email", event.target.value)}
                  aria-invalid={Boolean(formErrors.email)}
                  inputMode="email"
                />
                {renderFieldError("email")}
              </label>
              <label>
                <span>{t("mapLink")}</span>
                <input
                  value={formValues.mapsUrl}
                  onChange={(event) => updateFormValue("mapsUrl", event.target.value)}
                  aria-invalid={Boolean(formErrors.mapsUrl)}
                  inputMode="url"
                />
                {renderFieldError("mapsUrl")}
              </label>
              <label className="admin-form-grid__wide">
                <span>{t("address")}</span>
                <input value={formValues.address} onChange={(event) => updateFormValue("address", event.target.value)} />
              </label>
              <label className="admin-form-grid__wide">
                <span>{t("openingHours")}</span>
                <input value={formValues.workingHours} onChange={(event) => updateFormValue("workingHours", event.target.value)} />
              </label>
            </div>
          </AdminCard>

          <AdminCard className="admin-settings-section">
            <div className="admin-settings-section__header">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h3>{t("homepageContent")}</h3>
                <p>{t("homepageContentDescription")}</p>
              </div>
            </div>

            <div className="admin-form-grid">
              <label className="admin-form-grid__wide">
                <span>{t("heroTitle")}</span>
                <input value={formValues.heroTitle} onChange={(event) => updateFormValue("heroTitle", event.target.value)} />
              </label>
              <label className="admin-form-grid__wide">
                <span>{t("heroSubtitle")}</span>
                <textarea value={formValues.heroSubtitle} onChange={(event) => updateFormValue("heroSubtitle", event.target.value)} rows={3} />
              </label>
              <label>
                <span>{t("primaryCtaText")}</span>
                <input value={formValues.primaryCtaText} onChange={(event) => updateFormValue("primaryCtaText", event.target.value)} disabled={!canSaveBrand} />
              </label>
              <label>
                <span>{t("secondaryCtaText")}</span>
                <input value={formValues.secondaryCtaText} onChange={(event) => updateFormValue("secondaryCtaText", event.target.value)} disabled={!canSaveBrand} />
              </label>
              <label>
                <span>{t("heroImageUrlLabel")}</span>
                <input
                  value={formValues.heroImageUrl}
                  onChange={(event) => updateFormValue("heroImageUrl", event.target.value)}
                  aria-invalid={Boolean(formErrors.heroImageUrl)}
                  disabled={!canSaveBrand}
                  inputMode="url"
                  placeholder="https://example.com/hero.jpg"
                />
                {renderFieldError("heroImageUrl")}
              </label>
              <label>
                <span>{t("heroMediaTypeLabel")}</span>
                <select
                  value={formValues.heroMediaType}
                  onChange={(event) => updateFormValue("heroMediaType", event.target.value as HeroMediaType)}
                  aria-invalid={Boolean(formErrors.heroMediaType)}
                  disabled={!canSaveAdvancedTheme}
                >
                  {heroMediaTypes.map((type) => (
                    <option value={type} key={type}>
                      {heroMediaTypeLabels[type]}
                    </option>
                  ))}
                </select>
                {renderFieldError("heroMediaType")}
              </label>
              <label className="admin-form-grid__wide">
                <span>{t("heroVideoUrl")}</span>
                <input
                  value={formValues.heroVideoUrl}
                  onChange={(event) => updateFormValue("heroVideoUrl", event.target.value)}
                  aria-invalid={Boolean(formErrors.heroVideoUrl)}
                  disabled={!canSaveAdvancedTheme}
                  inputMode="url"
                  placeholder="https://example.com/hero.mp4"
                />
                {renderFieldError("heroVideoUrl")}
              </label>
              <label>
                <span>{t("heroLayout")}</span>
                <select
                  value={formValues.heroLayout}
                  onChange={(event) => updateFormValue("heroLayout", event.target.value as HeroLayoutPreset)}
                  aria-invalid={Boolean(formErrors.heroLayout)}
                  disabled={!canSaveAdvancedTheme}
                >
                  {heroLayouts.map((layout) => (
                    <option value={layout} key={layout}>
                      {heroLayoutLabels[layout]}
                    </option>
                  ))}
                </select>
                {renderFieldError("heroLayout")}
              </label>
              <label>
                <span>{t("themePreset")}</span>
                <select
                  value={formValues.themePreset}
                  onChange={(event) => updateFormValue("themePreset", event.target.value as ThemePreset)}
                  aria-invalid={Boolean(formErrors.themePreset)}
                  disabled={!canSaveAdvancedTheme}
                >
                  {themePresets.map((preset) => (
                    <option value={preset} key={preset}>
                      {themePresetLabels[preset]}
                    </option>
                  ))}
                </select>
                {renderFieldError("themePreset")}
              </label>
              <label>
                <span>{t("featuredDishes")}</span>
                <input value={formValues.featuredSectionTitle} onChange={(event) => updateFormValue("featuredSectionTitle", event.target.value)} disabled={!canSaveBrand} />
              </label>
              <label>
                <span>{t("offers")}</span>
                <input value={formValues.offersSectionTitle} onChange={(event) => updateFormValue("offersSectionTitle", event.target.value)} disabled={!canSaveBrand} />
              </label>
              <label>
                <span>{t("gallery")}</span>
                <input value={formValues.gallerySectionTitle} onChange={(event) => updateFormValue("gallerySectionTitle", event.target.value)} disabled={!canSaveBrand} />
              </label>
              <label>
                <span>{t("testimonials")}</span>
                <input value={formValues.testimonialsSectionTitle} onChange={(event) => updateFormValue("testimonialsSectionTitle", event.target.value)} disabled={!canSaveBrand} />
              </label>
              <label>
                <span>{t("sectionContact")}</span>
                <input value={formValues.contactSectionTitle} onChange={(event) => updateFormValue("contactSectionTitle", event.target.value)} disabled={!canSaveBrand} />
              </label>
              <label>
                <span>{t("faq")}</span>
                <input value={formValues.faqSectionTitle} onChange={(event) => updateFormValue("faqSectionTitle", event.target.value)} disabled={!canSaveBrand} />
              </label>
            </div>

            {canSaveBrand ? (
              <details className="admin-translation-panel">
                <summary>{t("homepageTranslations")}</summary>
                <div className="admin-translation-panel__grid">
                  {homepageTranslationLanguages.map((language) => (
                    <div className="admin-translation-panel__group" key={language}>
                      <h4>{homepageTranslationLanguageLabels[language]}</h4>
                      <div className="admin-form-grid">
                        {homepageTranslationFields.map((field) => (
                          <label className={field.includes("Subtitle") || field.includes("Policy") ? "admin-form-grid__wide" : ""} key={field}>
                            <span>{homepageTranslationLabels[field]}</span>
                            {field.includes("Subtitle") || field.includes("Policy") ? (
                              <textarea
                                value={formValues.translations[language][field]}
                                onChange={(event) => updateHomepageTranslation(language, field, event.target.value)}
                                rows={2}
                              />
                            ) : (
                              <input
                                value={formValues.translations[language][field]}
                                onChange={(event) => updateHomepageTranslation(language, field, event.target.value)}
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <div className="admin-toggle-grid admin-toggle-grid--compact" aria-label={t("homepageSections")}>
              {sectionToggles.map((item) => (
                <label className="admin-toggle-row" key={item.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(formValues[item.key])}
                    onChange={(event) => updateFormValue(item.key, event.target.checked)}
                    disabled={!canSaveBrand}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="admin-settings-section">
            <div className="admin-settings-section__header">
              <Settings size={20} aria-hidden="true" />
              <div>
                <h3>{t("reservationSettings")}</h3>
                <p>{t("reservationSettingsDescription")}</p>
              </div>
            </div>
            <div className="admin-form-grid">
              <label>
                <span>{t("reservationMaxPeople")}</span>
                <input
                  value={formValues.maxPeoplePerReservation}
                  onChange={(event) => updateFormValue("maxPeoplePerReservation", event.target.value)}
                  aria-invalid={Boolean(formErrors.maxPeoplePerReservation)}
                  inputMode="numeric"
                  placeholder="20"
                />
                {renderFieldError("maxPeoplePerReservation")}
              </label>
              <label className="admin-toggle-row admin-toggle-row--inline">
                <input
                  type="checkbox"
                  checked={formValues.requireManualReservationConfirmation}
                  onChange={(event) => updateFormValue("requireManualReservationConfirmation", event.target.checked)}
                  disabled={!canSaveReservationPolicies}
                />
                <span>{t("manualReservationConfirmation")}</span>
              </label>
              <label className="admin-form-grid__wide">
                <span>{t("depositPolicyTextLabel")}</span>
                <textarea
                  value={formValues.depositPolicyText}
                  onChange={(event) => updateFormValue("depositPolicyText", event.target.value)}
                  disabled={!canSaveReservationPolicies}
                  rows={3}
                />
              </label>
              <label className="admin-form-grid__wide">
                <span>{t("cancellationPolicyTextLabel")}</span>
                <textarea
                  value={formValues.cancellationPolicyText}
                  onChange={(event) => updateFormValue("cancellationPolicyText", event.target.value)}
                  disabled={!canSaveReservationPolicies}
                  rows={3}
                />
              </label>
              <label className="admin-toggle-row admin-toggle-row--inline">
                <input
                  type="checkbox"
                  checked={formValues.requireDepositForLargeGroups}
                  onChange={(event) => updateFormValue("requireDepositForLargeGroups", event.target.checked)}
                  disabled={!canSaveDepositWorkflow}
                />
                <span>{t("enableDepositForLargeGroups")}</span>
              </label>
              <label>
                <span>{t("depositThresholdPeopleLabel")}</span>
                <input
                  value={formValues.depositThresholdPeople}
                  onChange={(event) => updateFormValue("depositThresholdPeople", event.target.value)}
                  aria-invalid={Boolean(formErrors.depositThresholdPeople)}
                  disabled={!canSaveDepositWorkflow}
                  inputMode="numeric"
                  placeholder="8"
                />
                {renderFieldError("depositThresholdPeople")}
              </label>
              <label>
                <span>{t("depositAmountManualLabel")}</span>
                <input
                  value={formValues.depositAmount}
                  onChange={(event) => updateFormValue("depositAmount", event.target.value)}
                  aria-invalid={Boolean(formErrors.depositAmount)}
                  disabled={!canSaveDepositWorkflow}
                  inputMode="decimal"
                  placeholder="100"
                />
                {renderFieldError("depositAmount")}
              </label>
            </div>
            {!canSaveReservationPolicies || !canSaveDepositWorkflow ? (
              <div className="admin-feedback admin-feedback--warning">
                {t("reservationSettingsPlanNotice")}
              </div>
            ) : null}
          </AdminCard>

          {canSaveArchivePreferences ? (
            <AdminCard className="admin-settings-section">
              <div className="admin-settings-section__header">
                <Archive size={20} aria-hidden="true" />
                <div>
                  <h3>{t("archiveSettings")}</h3>
                  <p>{t("archiveSettingsDescription")}</p>
                </div>
              </div>
              <div className="admin-toggle-grid admin-toggle-grid--compact">
                <label className="admin-toggle-row">
                  <input
                    type="checkbox"
                    checked={formValues.enableManualArchiveActions}
                    onChange={(event) => updateFormValue("enableManualArchiveActions", event.target.checked)}
                  />
                  <span>{t("enableManualArchiveActionsLabel")}</span>
                </label>
                <label className="admin-toggle-row">
                  <input
                    type="checkbox"
                    checked={formValues.hideCompletedOrdersFromMainList}
                    onChange={(event) => updateFormValue("hideCompletedOrdersFromMainList", event.target.checked)}
                  />
                  <span>{t("hideCompletedOrdersLabel")}</span>
                </label>
                <label className="admin-toggle-row">
                  <input
                    type="checkbox"
                    checked={formValues.hideCancelledOrdersFromMainList}
                    onChange={(event) => updateFormValue("hideCancelledOrdersFromMainList", event.target.checked)}
                  />
                  <span>{t("hideCancelledOrdersLabel")}</span>
                </label>
                <label className="admin-toggle-row">
                  <input
                    type="checkbox"
                    checked={formValues.showPastReservationsInSeparateTab}
                    onChange={(event) => updateFormValue("showPastReservationsInSeparateTab", event.target.checked)}
                  />
                  <span>{t("showPastReservationsLabel")}</span>
                </label>
              </div>
              <div className="admin-form-grid">
                <label className="admin-toggle-row admin-toggle-row--inline">
                  <input
                    type="checkbox"
                    checked={formValues.autoArchiveCompletedOrders}
                    onChange={(event) => updateFormValue("autoArchiveCompletedOrders", event.target.checked)}
                  />
                  <span>{t("autoArchiveCompletedOrdersLabel")}</span>
                </label>
                <label>
                  <span>{t("autoArchiveOrdersAfterHoursLabel")}</span>
                  <input
                    value={formValues.orderAutoArchiveAfterHours}
                    onChange={(event) => updateFormValue("orderAutoArchiveAfterHours", event.target.value)}
                    aria-invalid={Boolean(formErrors.orderAutoArchiveAfterHours)}
                    inputMode="numeric"
                    placeholder="72"
                  />
                  {renderFieldError("orderAutoArchiveAfterHours")}
                </label>
                <label className="admin-toggle-row admin-toggle-row--inline">
                  <input
                    type="checkbox"
                    checked={formValues.autoArchiveCompletedReservations}
                    onChange={(event) => updateFormValue("autoArchiveCompletedReservations", event.target.checked)}
                  />
                  <span>{t("autoArchiveCompletedReservationsLabel")}</span>
                </label>
                <label>
                  <span>{t("autoArchiveReservationsAfterHoursLabel")}</span>
                  <input
                    value={formValues.reservationAutoArchiveAfterHours}
                    onChange={(event) => updateFormValue("reservationAutoArchiveAfterHours", event.target.value)}
                    aria-invalid={Boolean(formErrors.reservationAutoArchiveAfterHours)}
                    inputMode="numeric"
                    placeholder="72"
                  />
                  {renderFieldError("reservationAutoArchiveAfterHours")}
                </label>
              </div>
              <div className="admin-feedback admin-feedback--warning">
                {t("archiveAutoNote")}
              </div>
            </AdminCard>
          ) : null}

          {canSaveBrand ? (
            <>
              <AdminCard className="admin-settings-section">
                <div className="admin-settings-section__header">
                  <Settings size={20} aria-hidden="true" />
                  <div>
                    <h3>{t("brandSettings")}</h3>
                    <p>{t("brandColorsDescription")}</p>
                  </div>
                </div>
                <div className="admin-form-grid">
                  {(["primaryColor", "secondaryColor", "accentColor", "successColor"] as const).map((key) => (
                    <label key={key}>
                      <span>{colorLabels[key]}</span>
                      <span className="admin-color-field">
                        <span style={{ background: formValues[key] }} aria-hidden="true" />
                        <input value={formValues[key]} onChange={(event) => updateFormValue(key, event.target.value)} aria-invalid={Boolean(formErrors[key])} />
                      </span>
                      {renderFieldError(key)}
                    </label>
                  ))}
                </div>
              </AdminCard>

              <AdminCard className="admin-settings-section">
                <div className="admin-settings-section__header">
                  <ImageIcon size={20} aria-hidden="true" />
                  <div>
                    <h3>{t("brandImagesTitle")}</h3>
                    <p>{t("brandImagesDescription")}</p>
                  </div>
                </div>
                <div className="admin-form-grid">
                  <div className="admin-form-grid__wide">
                    <span className="admin-field-label">{t("restaurantLogoLabel")}</span>
                    <AdminImageUploader
                      restaurantId={activeRestaurantId ?? ""}
                      type="logo"
                      value={{
                        imageFileId: formValues.logoFileId || undefined,
                        imageUrl: formValues.logoPreviewUrl || undefined,
                      }}
                      onChange={(nextValue) => {
                        updateFormValue("logoFileId", nextValue.imageFileId ?? "");
                        updateFormValue("logoPreviewUrl", nextValue.imageUrl ?? "");
                      }}
                      disabled={isSaving || !activeRestaurantId}
                    />
                  </div>

                  <div className="admin-form-grid__wide">
                    <span className="admin-field-label">{t("heroImageLabel")}</span>
                    <AdminImageUploader
                      restaurantId={activeRestaurantId ?? ""}
                      type="hero"
                      value={{
                        imageFileId: formValues.heroImageFileId || undefined,
                        imageUrl: formValues.heroImageUrl || formValues.heroPreviewUrl || undefined,
                      }}
                      onChange={(nextValue) => {
                        updateFormValue("heroImageFileId", nextValue.imageFileId ?? "");
                        updateFormValue("heroImageUrl", nextValue.imageUrl ?? "");
                        updateFormValue("heroPreviewUrl", nextValue.imageUrl ?? "");
                      }}
                      disabled={isSaving || !activeRestaurantId}
                    />
                  </div>
                </div>
              </AdminCard>
            </>
          ) : (
            <AdminCard className="admin-settings-section">
              <div className="admin-settings-section__header">
                <ImageIcon size={20} aria-hidden="true" />
                <div>
                  <h3>{t("brandSettings")}</h3>
                  <p>{t("brandOverviewDescription")}</p>
                </div>
              </div>
              <AdminErrorState title={t("featureUnavailable")} message={t("contactSupport")} />
            </AdminCard>
          )}

          {canSaveAdvancedTheme ? (
            <>
              <AdminCard className="admin-settings-section">
                <div className="admin-settings-section__header">
                  <Settings size={20} aria-hidden="true" />
                  <div>
                    <h3>{t("languageSettings")}</h3>
                    <p>{t("siteSettingsDescription")}</p>
                  </div>
                </div>
                <div className="admin-form-grid">
                  <label>
                    <span>{t("currencyLabel")}</span>
                    <input value={formValues.currency} onChange={(event) => updateFormValue("currency", event.target.value)} placeholder="د.م" />
                  </label>
                  <label>
                    <span>{t("language")}</span>
                    <input value={formValues.language} onChange={(event) => updateFormValue("language", event.target.value)} placeholder="ar" />
                  </label>
                  <label>
                    <span>{t("directionLabel")}</span>
                    <select value={formValues.direction} onChange={(event) => updateFormValue("direction", event.target.value as SiteDirection)} aria-invalid={Boolean(formErrors.direction)}>
                      {directions.map((direction) => (
                        <option value={direction} key={direction}>
                          {directionLabels[direction]}
                        </option>
                      ))}
                    </select>
                    {renderFieldError("direction")}
                  </label>
                  <label>
                    <span>{t("orderSettings")}</span>
                    <select value={formValues.orderMode} onChange={(event) => updateFormValue("orderMode", event.target.value as OrderMode)} aria-invalid={Boolean(formErrors.orderMode)}>
                      {orderModes.map((mode) => (
                        <option value={mode} key={mode}>
                          {modeLabels[mode]}
                        </option>
                      ))}
                    </select>
                    {renderFieldError("orderMode")}
                  </label>
                  <label>
                    <span>{t("reservationModeLabel")}</span>
                    <select
                      value={formValues.reservationMode}
                      onChange={(event) => updateFormValue("reservationMode", event.target.value as ReservationMode)}
                      aria-invalid={Boolean(formErrors.reservationMode)}
                    >
                      {reservationModes.map((mode) => (
                        <option value={mode} key={mode}>
                          {modeLabels[mode]}
                        </option>
                      ))}
                    </select>
                    {renderFieldError("reservationMode")}
                  </label>
                </div>
              </AdminCard>
            </>
          ) : (
            <AdminCard className="admin-settings-section">
              <div className="admin-settings-section__header">
                <Settings size={20} aria-hidden="true" />
                <div>
                  <h3>{t("advancedSettingsTitle")}</h3>
                  <p>{t("advancedSettingsDescription")}</p>
                </div>
              </div>
              <AdminErrorState title={t("featureUnavailable")} message={t("contactSupport")} />
            </AdminCard>
          )}

          <div className="admin-settings-form__actions">
            <AdminActionButton variant="primary" type="submit" icon={<Save size={18} aria-hidden="true" />} disabled={isSaving}>
              {isSaving ? t("saving") : t("saveSettings")}
            </AdminActionButton>
          </div>
        </form>
      ) : null}
    </section>
  );
}
