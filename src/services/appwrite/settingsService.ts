import { Query } from "appwrite";
import type { Models } from "appwrite";
import { TABLES } from "../../lib/appwriteIds";
import type { OrderMode, ReservationMode, SiteDirection, SiteSettings } from "../../types/appwriteModels";
import { getFirstRow } from "./readRows";

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

export async function getSiteSettings(restaurantId: string): Promise<SiteSettings | null> {
  const row = await getFirstRow<SiteSettingsRow>(TABLES.siteSettings, [
    Query.equal("restaurantId", restaurantId),
    Query.limit(1),
  ]);

  return row ? mapSiteSettings(row) : null;
}
