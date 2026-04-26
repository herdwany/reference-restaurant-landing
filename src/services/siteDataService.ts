import {
  defaultRestaurantConfig,
  type Dish as ConfigDish,
  type FAQItem as ConfigFAQItem,
  type GalleryImage,
  type Offer as ConfigOffer,
  type RestaurantConfig,
  type Testimonial as ConfigTestimonial,
} from "../data/restaurantConfig";
import { isAppwriteConfigured } from "../lib/appwriteClient";
import { DEFAULT_RESTAURANT_SLUG } from "../lib/appwriteIds";
import type {
  Dish as AppwriteDish,
  FAQItem as AppwriteFAQItem,
  GalleryItem,
  Offer as AppwriteOffer,
  Restaurant,
  SiteSettings,
  Testimonial as AppwriteTestimonial,
} from "../types/platform";
import { getPublicDishes } from "./repositories/dishesRepository";
import { getVisibleFaqs } from "./repositories/faqRepository";
import { getVisibleGalleryItems } from "./repositories/galleryRepository";
import { getActiveOffers } from "./repositories/offersRepository";
import { getRestaurantBySlug } from "./repositories/restaurantRepository";
import { getSiteSettings } from "./repositories/settingsRepository";
import { getVisibleTestimonials } from "./repositories/testimonialsRepository";

export type SiteDataSource = "config" | "appwrite";

export interface SiteDataResult {
  config: RestaurantConfig;
  source: SiteDataSource;
  isFallback: boolean;
}

const withFallback = (): SiteDataResult => ({
  config: defaultRestaurantConfig,
  source: "config",
  isFallback: true,
});

const mapRestaurant = (restaurant: Restaurant, base: RestaurantConfig): RestaurantConfig["restaurant"] => ({
  ...base.restaurant,
  name: restaurant.nameAr || restaurant.name || base.restaurant.name,
  slogan: restaurant.tagline || base.restaurant.slogan,
  logoText: restaurant.nameAr || restaurant.name || base.restaurant.logoText,
  phone: restaurant.phone || base.restaurant.phone,
  whatsappNumber: restaurant.whatsappNumber || base.restaurant.whatsappNumber,
  email: restaurant.email || base.restaurant.email,
  address: restaurant.address || base.restaurant.address,
  workingHours: restaurant.workingHours || base.restaurant.workingHours,
  mapImage: restaurant.mapImageUrl || base.restaurant.mapImage,
  mapUrl: restaurant.mapsUrl || base.restaurant.mapUrl,
});

const mapBrand = (restaurant: Restaurant, base: RestaurantConfig): RestaurantConfig["brand"] => ({
  ...base.brand,
  primaryColor: restaurant.primaryColor || base.brand.primaryColor,
  secondaryColor: restaurant.secondaryColor || base.brand.secondaryColor,
  accentColor: restaurant.accentColor || base.brand.accentColor,
  successColor: restaurant.successColor || base.brand.successColor,
  heroImage: restaurant.heroImageUrl || base.brand.heroImage,
});

const mapSettings = (settings: SiteSettings | null, base: RestaurantConfig): RestaurantConfig["settings"] => {
  if (!settings) {
    return base.settings;
  }

  return {
    sections: {
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

const mapDishes = (dishes: AppwriteDish[], base: RestaurantConfig): ConfigDish[] =>
  dishes.map((dish, index) => {
    const fallback = base.dishes[index % base.dishes.length];
    return {
      id: dish.id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      oldPrice: dish.oldPrice,
      image: dish.imageUrl || fallback.image,
      badge: dish.badge,
      category: dish.category,
      rating: dish.rating,
      isPopular: dish.isPopular,
      ingredients: dish.ingredients,
    };
  });

const mapOffers = (offers: AppwriteOffer[], base: RestaurantConfig): ConfigOffer[] =>
  offers.map((offer, index) => {
    const fallback = base.offers[index % base.offers.length];
    return {
      id: offer.id,
      title: offer.title,
      description: offer.description,
      price: offer.price,
      oldPrice: offer.oldPrice ?? fallback.oldPrice,
      image: offer.imageUrl || fallback.image,
      colorTheme: offer.colorTheme,
      ctaText: offer.ctaText,
    };
  });

const mapGallery = (items: GalleryItem[], base: RestaurantConfig): GalleryImage[] =>
  items.map((item, index) => {
    const fallback = base.galleryImages[index % base.galleryImages.length];
    return {
      id: item.id,
      title: item.title,
      image: item.imageUrl || fallback.image,
    };
  });

const mapTestimonials = (items: AppwriteTestimonial[], base: RestaurantConfig): ConfigTestimonial[] =>
  items.map((item, index) => {
    const fallback = base.testimonials[index % base.testimonials.length];
    return {
      name: item.name,
      text: item.text,
      rating: item.rating,
      avatar: item.avatarUrl || fallback.avatar,
      role: item.role,
    };
  });

const mapFaqs = (items: AppwriteFAQItem[]): ConfigFAQItem[] =>
  items.map((item) => ({
    question: item.question,
    answer: item.answer,
  }));

export async function getSiteData(slug = DEFAULT_RESTAURANT_SLUG): Promise<SiteDataResult> {
  if (!isAppwriteConfigured) {
    return withFallback();
  }

  try {
    const restaurant = await getRestaurantBySlug(slug);

    if (!restaurant) {
      return withFallback();
    }

    const [settings, dishes, offers, galleryItems, testimonials, faqs] = await Promise.all([
      getSiteSettings(restaurant.id),
      getPublicDishes(restaurant.id),
      getActiveOffers(restaurant.id),
      getVisibleGalleryItems(restaurant.id),
      getVisibleTestimonials(restaurant.id),
      getVisibleFaqs(restaurant.id),
    ]);

    const config: RestaurantConfig = {
      ...defaultRestaurantConfig,
      settings: mapSettings(settings, defaultRestaurantConfig),
      restaurant: {
        ...mapRestaurant(restaurant, defaultRestaurantConfig),
        currency: settings?.currency || defaultRestaurantConfig.restaurant.currency,
      },
      brand: mapBrand(restaurant, defaultRestaurantConfig),
      hero: {
        ...defaultRestaurantConfig.hero,
        image: restaurant.heroImageUrl || defaultRestaurantConfig.hero.image,
      },
      dishes: dishes.length ? mapDishes(dishes, defaultRestaurantConfig) : defaultRestaurantConfig.dishes,
      offers: offers.length ? mapOffers(offers, defaultRestaurantConfig) : defaultRestaurantConfig.offers,
      galleryImages: galleryItems.length ? mapGallery(galleryItems, defaultRestaurantConfig) : defaultRestaurantConfig.galleryImages,
      testimonials: testimonials.length
        ? mapTestimonials(testimonials, defaultRestaurantConfig)
        : defaultRestaurantConfig.testimonials,
      faqs: faqs.length ? mapFaqs(faqs) : defaultRestaurantConfig.faqs,
    };

    return {
      config,
      source: "appwrite",
      isFallback: false,
    };
  } catch {
    return withFallback();
  }
}
