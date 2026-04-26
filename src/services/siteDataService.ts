import {
  defaultRestaurantConfig,
  type Dish as ConfigDish,
  type RestaurantConfig,
} from "../data/restaurantConfig";
import { isAppwriteConfigured } from "../lib/appwriteClient";
import { DEFAULT_RESTAURANT_SLUG } from "../lib/appwriteIds";
import type { Dish as AppwriteDish } from "../types/platform";
import { getPublicDishes } from "./repositories/dishesRepository";
import { getRestaurantBySlug } from "./repositories/restaurantRepository";

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

export async function getSiteData(slug = DEFAULT_RESTAURANT_SLUG): Promise<SiteDataResult> {
  if (!isAppwriteConfigured) {
    return withFallback();
  }

  try {
    const restaurant = await getRestaurantBySlug(slug);

    if (!restaurant) {
      return withFallback();
    }

    const dishes = await getPublicDishes(restaurant.id);

    if (dishes.length === 0) {
      return withFallback();
    }

    return {
      config: {
        ...defaultRestaurantConfig,
        dishes: mapDishes(dishes, defaultRestaurantConfig),
      },
      source: "appwrite",
      isFallback: false,
    };
  } catch {
    return withFallback();
  }
}
