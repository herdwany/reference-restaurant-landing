import {
  defaultRestaurantConfig,
  type Dish as ConfigDish,
  type FAQItem as ConfigFAQItem,
  type GalleryImage as ConfigGalleryImage,
  type Offer as ConfigOffer,
  type RestaurantConfig,
} from "../data/restaurantConfig";
import { isAppwriteConfigured } from "../lib/appwriteClient";
import { DEFAULT_RESTAURANT_SLUG } from "../lib/appwriteIds";
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
  restaurantStatus: RestaurantStatus;
}

const withFallback = (): SiteDataResult => ({
  config: defaultRestaurantConfig,
  source: "config",
  isFallback: true,
  restaurantStatus: "active",
});

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

const mapDishes = (dishes: AppwriteDish[], base: RestaurantConfig): ConfigDish[] =>
  dishes.map((dish, index) => {
    const fallback = base.dishes[index % base.dishes.length];
    const imageUrl = isAcceptableImageUrl(dish.imageUrl) ? dish.imageUrl : undefined;

    return {
      id: dish.id,
      name: dish.name,
      description: dish.description,
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

  return {
    ...base.restaurant,
    id: restaurant.id,
    name: displayName,
    slogan: restaurant.tagline || base.restaurant.slogan,
    logoText: displayName,
    logoImage,
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
    };
  }

  return {
    ...base.settings,
    currency: settings.currency || base.settings.currency,
    language: settings.language || base.settings.language,
    direction: settings.direction || base.settings.direction,
    orderMode: settings.orderMode || base.settings.orderMode,
    reservationMode: settings.reservationMode || base.settings.reservationMode,
    sections: {
      ...base.settings.sections,
      hero: settings.showHero,
      trustBadges: settings.showTrustBadges,
      featuredDishes: settings.showFeaturedDishes,
      offers: settings.showOffers,
      gallery: settings.showGallery,
      testimonials: settings.showTestimonials,
      actionGrid: settings.showActionGrid,
      faq: settings.showFaq,
      footer: settings.showFooter,
    },
  };
};

const getSettledValue = <Value,>(result: PromiseSettledResult<Value>, fallback: Value) =>
  result.status === "fulfilled" ? result.value : fallback;

export async function getSiteData(slug = DEFAULT_RESTAURANT_SLUG): Promise<SiteDataResult> {
  if (!isAppwriteConfigured) {
    return withFallback();
  }

  try {
    const restaurant = await getRestaurantBySlug(slug);

    if (!restaurant) {
      return withFallback();
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
          hero: {
            ...defaultRestaurantConfig.hero,
            subtitle: restaurant.description || defaultRestaurantConfig.hero.subtitle,
            image: getRestaurantHeroImage(restaurant) || defaultRestaurantConfig.hero.image,
          },
        },
        source: "appwrite",
        isFallback: false,
        restaurantStatus: restaurant.status,
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
    const heroImage = getRestaurantHeroImage(restaurant) || defaultRestaurantConfig.hero.image;
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
        hero: {
          ...defaultRestaurantConfig.hero,
          subtitle: restaurant.description || defaultRestaurantConfig.hero.subtitle,
          image: heroImage,
        },
        ui: {
          ...defaultRestaurantConfig.ui,
          footer: {
            ...defaultRestaurantConfig.ui.footer,
            description: restaurant.description || defaultRestaurantConfig.ui.footer.description,
          },
        },
        dishes: hasAppwriteDishes ? mapDishes(dishes, defaultRestaurantConfig) : defaultRestaurantConfig.dishes,
        offers: hasAppwriteOffers ? mapOffers(offers, defaultRestaurantConfig) : defaultRestaurantConfig.offers,
        faqs: hasAppwriteFaqs ? mapFaqs(faqs) : defaultRestaurantConfig.faqs,
        galleryImages: hasAppwriteGalleryItems ? mapGalleryImages(galleryItems, defaultRestaurantConfig) : defaultRestaurantConfig.galleryImages,
      },
      source: "appwrite",
      isFallback: false,
      restaurantStatus: restaurant.status,
    };
  } catch {
    return withFallback();
  }
}
