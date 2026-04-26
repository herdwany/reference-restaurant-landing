import { Query, type Models } from "appwrite";
import { COLLECTIONS } from "../../lib/appwriteIds";
import type { BusinessType, Restaurant, RestaurantStatus } from "../../types/platform";
import { getFirstRow, getRowById } from "./readRows";

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
