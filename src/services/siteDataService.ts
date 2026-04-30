import {
  defaultRestaurantConfig,
  type Dish as ConfigDish,
  type FAQItem as ConfigFAQItem,
  type GalleryImage as ConfigGalleryImage,
  type Offer as ConfigOffer,
  type RestaurantConfig,
} from "../data/restaurantConfig";
import { isAppwriteConfigured } from "../lib/appwriteClient";
import { DEFAULT_RESTAURANT_SLUG, isDevelopmentBuild } from "../lib/appwriteIds";
import { isPublicRestaurantUnavailable } from "../lib/featureAccess";
import type {
  Dish as AppwriteDish,
  FAQItem as AppwriteFAQItem,
  GalleryItem as AppwriteGalleryItem,
  Offer as AppwriteOffer,
  Restaurant,
  RestaurantStatus,
  SiteSettings,
} from "../types/platform";
import { getPublicDishes } from "./repositories/dishesRepository";
import { getVisibleFaqs } from "./repositories/faqRepository";
import { getVisibleGalleryItems } from "./repositories/galleryRepository";
import { getActiveOffers } from "./repositories/offersRepository";
import { getRestaurantBySlug } from "./repositories/restaurantRepository";
import { getSiteSettings } from "./repositories/settingsRepository";
import { getFileViewUrl } from "./appwrite/storageService";

export type SiteDataSource = "config" | "appwrite";

export interface SiteDataResult {
  config: RestaurantConfig;
  source: SiteDataSource;
  isFallback: boolean;
  isNotFound: boolean;
  restaurantStatus: RestaurantStatus;
  resolvedSlug: string;
}

const normalizeSlug = (slug: string | undefined) => slug?.trim().toLowerCase() || "";

const withFallback = (resolvedSlug = DEFAULT_RESTAURANT_SLUG): SiteDataResult => ({
  config: defaultRestaurantConfig,
  source: "config",
  isFallback: true,
  isNotFound: false,
  restaurantStatus: "active",
  resolvedSlug,
});

const withNotFound = (resolvedSlug: string): SiteDataResult => ({
  config: defaultRestaurantConfig,
  source: "config",
  isFallback: false,
  isNotFound: true,
  restaurantStatus: "active",
  resolvedSlug,
});

const canUseConfigFallbackForSlug = (slug: string, hasExplicitSlug: boolean) =>
  !hasExplicitSlug || (isDevelopmentBuild && slug === DEFAULT_RESTAURANT_SLUG);

const isAcceptableImageUrl = (value: string | undefined) => {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const getStoredAssetUrl = (fileId: string | undefined) => {
  if (!fileId) {
    return undefined;
  }

  try {
    return getFileViewUrl(fileId);
  } catch {
    return undefined;
  }
};

const resolveImageUrl = (...candidates: (string | undefined)[]) => candidates.find(isAcceptableImageUrl);

const parseTranslationsObject = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, Record<string, string>>) : undefined;
  } catch {
    return undefined;
  }
};

const heroLayouts = new Set(["split", "background", "centered"]);
const themePresets = new Set(["classic_red", "black_gold", "coffee", "fresh", "minimal"]);
const fontPresets = new Set(["modern", "classic", "elegant", "friendly"]);
const cardStyles = new Set(["soft", "bordered", "flat", "premium"]);
const buttonStyles = new Set(["rounded", "soft", "sharp", "premium"]);
const headerStyles = new Set(["clean", "centered", "glass", "solid"]);
const footerStyles = new Set(["dark", "light", "brand", "minimal"]);
const sectionSpacings = new Set(["compact", "normal", "wide"]);
const backgroundStyles = new Set(["warm", "clean", "pattern", "solid", "premium"]);

const getHeroLayout = (value: string | undefined) =>
  heroLayouts.has(value || "") ? (value as RestaurantConfig["hero"]["layout"]) : "split";

const getThemePreset = (value: string | undefined) =>
  themePresets.has(value || "") ? (value as NonNullable<RestaurantConfig["settings"]["themePreset"]>) : "classic_red";

const getFontPreset = (value: string | undefined) =>
  fontPresets.has(value || "") ? (value as NonNullable<RestaurantConfig["settings"]["fontPreset"]>) : "modern";

const getCardStyle = (value: string | undefined) =>
  cardStyles.has(value || "") ? (value as NonNullable<RestaurantConfig["settings"]["cardStyle"]>) : "soft";

const getButtonStyle = (value: string | undefined) =>
  buttonStyles.has(value || "") ? (value as NonNullable<RestaurantConfig["settings"]["buttonStyle"]>) : "rounded";

const getHeaderStyle = (value: string | undefined) =>
  headerStyles.has(value || "") ? (value as NonNullable<RestaurantConfig["settings"]["headerStyle"]>) : "clean";

const getFooterStyle = (value: string | undefined) =>
  footerStyles.has(value || "") ? (value as NonNullable<RestaurantConfig["settings"]["footerStyle"]>) : "dark";

const getSectionSpacing = (value: string | undefined) =>
  sectionSpacings.has(value || "") ? (value as NonNullable<RestaurantConfig["settings"]["sectionSpacing"]>) : "normal";

const getBackgroundStyle = (value: string | undefined) =>
  backgroundStyles.has(value || "") ? (value as NonNullable<RestaurantConfig["settings"]["backgroundStyle"]>) : "warm";

const mapDishes = (dishes: AppwriteDish[], base: RestaurantConfig): ConfigDish[] =>
  dishes.map((dish, index) => {
    const fallback = base.dishes[index % base.dishes.length];
    const imageUrl = isAcceptableImageUrl(dish.imageUrl) ? dish.imageUrl : undefined;

    return {
      id: dish.id,
      name: dish.name,
      description: dish.description,
      translations: parseTranslationsObject(dish.translations),
      price: dish.price,
      oldPrice: dish.oldPrice,
      image: imageUrl || fallback.image,
      imageUrl,
      badge: dish.badge,
      category: dish.category,
      rating: dish.rating ?? fallback.rating,
      isPopular: dish.isPopular,
      ingredients: dish.ingredients?.length ? dish.ingredients : fallback.ingredients,
    };
  });

const mapOffers = (offers: AppwriteOffer[], base: RestaurantConfig): ConfigOffer[] =>
  offers.map((offer, index) => {
    const fallback = base.offers[index % base.offers.length];
    const imageUrl = isAcceptableImageUrl(offer.imageUrl) ? offer.imageUrl : undefined;

    return {
      id: offer.id,
      title: offer.title,
      description: offer.description,
      translations: parseTranslationsObject(offer.translations),
      price: offer.price,
      oldPrice: offer.oldPrice ?? fallback.oldPrice,
      image: imageUrl || fallback.image,
      imageUrl,
      colorTheme: offer.colorTheme,
      ctaText: offer.ctaText || fallback.ctaText,
      isActive: offer.isActive,
      sortOrder: offer.sortOrder,
      startsAt: offer.startsAt,
      endsAt: offer.endsAt,
    };
  });

const mapFaqs = (faqs: AppwriteFAQItem[]): ConfigFAQItem[] =>
  faqs.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
    translations: parseTranslationsObject(faq.translations),
  }));

const mapGalleryImages = (items: AppwriteGalleryItem[], base: RestaurantConfig): ConfigGalleryImage[] =>
  items.map((item, index) => {
    const fallback = base.galleryImages[index % base.galleryImages.length];
    const imageUrl = isAcceptableImageUrl(item.imageUrl) ? item.imageUrl : undefined;

    return {
      id: item.id,
      title: item.title,
      alt: item.alt || item.title,
      image: imageUrl || fallback.image,
      imageUrl,
    };
  });

const mergeRestaurant = (restaurant: Restaurant, base: RestaurantConfig): RestaurantConfig["restaurant"] => {
  const displayName = restaurant.nameAr || restaurant.name || base.restaurant.name;
  const logoImage = resolveImageUrl(getStoredAssetUrl(restaurant.logoFileId));
  const faviconImage = resolveImageUrl(getStoredAssetUrl(restaurant.faviconFileId));

  return {
    ...base.restaurant,
    id: restaurant.id,
    slug: restaurant.slug,
    name: displayName,
    slogan: restaurant.tagline || base.restaurant.slogan,
    logoText: displayName,
    logoImage,
    faviconImage,
    phone: restaurant.phone || base.restaurant.phone,
    whatsappNumber: restaurant.whatsappNumber || base.restaurant.whatsappNumber,
    email: restaurant.email || base.restaurant.email,
    address: restaurant.address || base.restaurant.address,
    workingHours: restaurant.workingHours || base.restaurant.workingHours,
    mapUrl: restaurant.mapsUrl || base.restaurant.mapUrl,
  };
};

const getRestaurantHeroImage = (restaurant: Restaurant) =>
  resolveImageUrl(restaurant.heroImageUrl, getStoredAssetUrl(restaurant.heroImageFileId));

const mergeBrand = (restaurant: Restaurant, base: RestaurantConfig): RestaurantConfig["brand"] => ({
  ...base.brand,
  primaryColor: restaurant.primaryColor || base.brand.primaryColor,
  secondaryColor: restaurant.secondaryColor || base.brand.secondaryColor,
  accentColor: restaurant.accentColor || base.brand.accentColor,
  successColor: restaurant.successColor || base.brand.successColor,
  heroImage: getRestaurantHeroImage(restaurant) || base.brand.heroImage,
});

const mergeSettings = (settings: SiteSettings | null, base: RestaurantConfig): RestaurantConfig["settings"] => {
  if (!settings) {
    return {
      ...base.settings,
      orderMode: "both",
      reservationMode: "both",
      themePreset: base.settings.themePreset ?? "classic_red",
      fontPreset: base.settings.fontPreset ?? "modern",
      cardStyle: base.settings.cardStyle ?? "soft",
      buttonStyle: base.settings.buttonStyle ?? "rounded",
      headerStyle: base.settings.headerStyle ?? "clean",
      footerStyle: base.settings.footerStyle ?? "dark",
      sectionSpacing: base.settings.sectionSpacing ?? "normal",
      backgroundStyle: base.settings.backgroundStyle ?? "warm",
    };
  }

  return {
    ...base.settings,
    currency: settings.currency || base.settings.currency,
    language: settings.language || base.settings.language,
    direction: settings.direction || base.settings.direction,
    orderMode: settings.orderMode || base.settings.orderMode,
    reservationMode: settings.reservationMode || base.settings.reservationMode,
    themePreset: getThemePreset(settings.themePreset),
    fontPreset: getFontPreset(settings.fontPreset),
    cardStyle: getCardStyle(settings.cardStyle),
    buttonStyle: getButtonStyle(settings.buttonStyle),
    headerStyle: getHeaderStyle(settings.headerStyle),
    footerStyle: getFooterStyle(settings.footerStyle),
    sectionSpacing: getSectionSpacing(settings.sectionSpacing),
    backgroundStyle: getBackgroundStyle(settings.backgroundStyle),
    requireManualReservationConfirmation: Boolean(settings.requireManualReservationConfirmation),
    requireDepositForLargeGroups: Boolean(settings.requireDepositForLargeGroups),
    depositThresholdPeople: settings.depositThresholdPeople ?? base.settings.depositThresholdPeople,
    depositAmount: settings.depositAmount ?? base.settings.depositAmount,
    depositPolicyText: settings.depositPolicyText?.trim() || base.settings.depositPolicyText,
    cancellationPolicyText: settings.cancellationPolicyText?.trim() || base.settings.cancellationPolicyText,
    maxPeoplePerReservation: settings.maxPeoplePerReservation ?? base.settings.maxPeoplePerReservation,
    translations: parseTranslationsObject(settings.translations),
    sections: {
      ...base.settings.sections,
      hero: settings.showHero,
      trustBadges: settings.showTrustBadges,
      featuredDishes: settings.showFeatured ?? settings.showFeaturedDishes,
      offers: settings.showOffers,
      gallery: settings.showGallery,
      testimonials: settings.showTestimonials,
      actionGrid: settings.showContact ?? settings.showActionGrid,
      faq: settings.showFaq,
      footer: settings.showFooter,
    },
  };
};

const mergeHero = (
  restaurant: Restaurant,
  settings: SiteSettings | null,
  base: RestaurantConfig,
): RestaurantConfig["hero"] => {
  const videoUrl = isAcceptableImageUrl(settings?.heroVideoUrl) ? settings?.heroVideoUrl : "";
  const mediaType = settings?.heroMediaType === "video_url" && videoUrl ? "video_url" : "image";

  return {
    ...base.hero,
    title: settings?.heroTitle?.trim() || base.hero.title,
    subtitle: settings?.heroSubtitle?.trim() || restaurant.description || base.hero.subtitle,
    primaryCtaText: settings?.primaryCtaText?.trim() || base.hero.primaryCtaText,
    secondaryCtaText: settings?.secondaryCtaText?.trim() || base.hero.secondaryCtaText,
    image: resolveImageUrl(settings?.heroImageUrl, getRestaurantHeroImage(restaurant), base.hero.image) || base.hero.image,
    mediaType,
    videoUrl,
    layout: getHeroLayout(settings?.heroLayout),
  };
};

const mergeUi = (
  restaurant: Restaurant,
  settings: SiteSettings | null,
  base: RestaurantConfig,
): RestaurantConfig["ui"] => ({
  ...base.ui,
  sectionTitles: {
    ...base.ui.sectionTitles,
    featuredDishes: settings?.featuredSectionTitle?.trim() || base.ui.sectionTitles.featuredDishes,
    offers: settings?.offersSectionTitle?.trim() || base.ui.sectionTitles.offers,
    testimonials: settings?.testimonialsSectionTitle?.trim() || base.ui.sectionTitles.testimonials,
    actionGrid: settings?.contactSectionTitle?.trim() || base.ui.sectionTitles.actionGrid,
    gallery: settings?.gallerySectionTitle?.trim() || base.ui.sectionTitles.gallery,
    faq: settings?.faqSectionTitle?.trim() || base.ui.sectionTitles.faq,
  },
  footer: {
    ...base.ui.footer,
    description: restaurant.description || base.ui.footer.description,
  },
});

const getSettledValue = <Value,>(result: PromiseSettledResult<Value>, fallback: Value) =>
  result.status === "fulfilled" ? result.value : fallback;

export async function getSiteDataBySlug(slug?: string): Promise<SiteDataResult> {
  const explicitSlug = normalizeSlug(slug);
  const hasExplicitSlug = Boolean(explicitSlug);
  const resolvedSlug = explicitSlug || DEFAULT_RESTAURANT_SLUG;
  const canUseFallback = canUseConfigFallbackForSlug(resolvedSlug, hasExplicitSlug);

  if (!isAppwriteConfigured) {
    if (canUseFallback) {
      if (hasExplicitSlug && isDevelopmentBuild) {
        console.warn(`Using local restaurantConfig.ts fallback for public slug "${resolvedSlug}".`);
      }

      return withFallback(resolvedSlug);
    }

    return withNotFound(resolvedSlug);
  }

  try {
    const restaurant = await getRestaurantBySlug(resolvedSlug);

    if (!restaurant) {
      return canUseFallback ? withFallback(resolvedSlug) : withNotFound(resolvedSlug);
    }

    const mergedRestaurant = {
      ...mergeRestaurant(restaurant, defaultRestaurantConfig),
      currency: defaultRestaurantConfig.restaurant.currency,
    };

    if (isPublicRestaurantUnavailable(restaurant.status)) {
      return {
        config: {
          ...defaultRestaurantConfig,
          restaurant: mergedRestaurant,
          brand: mergeBrand(restaurant, defaultRestaurantConfig),
          hero: mergeHero(restaurant, null, defaultRestaurantConfig),
        },
        source: "appwrite",
        isFallback: false,
        isNotFound: false,
        restaurantStatus: restaurant.status,
        resolvedSlug: restaurant.slug,
      };
    }

    const [dishesResult, offersResult, settingsResult, faqsResult, galleryResult] = await Promise.allSettled([
      getPublicDishes(restaurant.id),
      getActiveOffers(restaurant.id),
      getSiteSettings(restaurant.id),
      getVisibleFaqs(restaurant.id),
      getVisibleGalleryItems(restaurant.id),
    ]);

    const dishes = getSettledValue<AppwriteDish[]>(dishesResult, []);
    const offers = getSettledValue<AppwriteOffer[]>(offersResult, []);
    const siteSettings = getSettledValue<SiteSettings | null>(settingsResult, null);
    const faqs = getSettledValue<AppwriteFAQItem[]>(faqsResult, []);
    const galleryItems = getSettledValue<AppwriteGalleryItem[]>(galleryResult, []);
    const hasAppwriteDishes = dishes.length > 0;
    const hasAppwriteOffers = offers.length > 0;
    const hasAppwriteFaqs = faqs.length > 0;
    const hasAppwriteGalleryItems = galleryItems.length > 0;
    const mergedSettings = mergeSettings(siteSettings, defaultRestaurantConfig);
    const activeMergedRestaurant = {
      ...mergeRestaurant(restaurant, defaultRestaurantConfig),
      currency: mergedSettings.currency || defaultRestaurantConfig.restaurant.currency,
    };

    return {
      config: {
        ...defaultRestaurantConfig,
        restaurant: activeMergedRestaurant,
        brand: mergeBrand(restaurant, defaultRestaurantConfig),
        settings: mergedSettings,
        hero: mergeHero(restaurant, siteSettings, defaultRestaurantConfig),
        ui: mergeUi(restaurant, siteSettings, defaultRestaurantConfig),
        dishes: hasAppwriteDishes ? mapDishes(dishes, defaultRestaurantConfig) : defaultRestaurantConfig.dishes,
        offers: hasAppwriteOffers ? mapOffers(offers, defaultRestaurantConfig) : defaultRestaurantConfig.offers,
        faqs: hasAppwriteFaqs ? mapFaqs(faqs) : defaultRestaurantConfig.faqs,
        galleryImages: hasAppwriteGalleryItems ? mapGalleryImages(galleryItems, defaultRestaurantConfig) : defaultRestaurantConfig.galleryImages,
      },
      source: "appwrite",
      isFallback: false,
      isNotFound: false,
      restaurantStatus: restaurant.status,
      resolvedSlug: restaurant.slug,
    };
  } catch {
    return canUseFallback ? withFallback(resolvedSlug) : withNotFound(resolvedSlug);
  }
}

export async function getSiteData(slug?: string): Promise<SiteDataResult> {
  return getSiteDataBySlug(slug);
}
