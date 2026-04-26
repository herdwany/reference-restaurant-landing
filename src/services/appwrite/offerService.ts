import { Query } from "appwrite";
import type { Models } from "appwrite";
import { TABLES } from "../../lib/appwriteIds";
import type { ColorTheme, Offer } from "../../types/appwriteModels";
import { listRows } from "./readRows";

interface OfferRow extends Models.Row {
  restaurantId: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  colorTheme: ColorTheme;
  ctaText: string;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder?: number | null;
}

const isWithinOfferWindow = (offer: Offer) => {
  const now = Date.now();
  const startsAt = offer.startsAt ? Date.parse(offer.startsAt) : null;
  const endsAt = offer.endsAt ? Date.parse(offer.endsAt) : null;

  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
};

const mapOffer = (row: OfferRow): Offer => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  title: row.title,
  description: row.description,
  price: row.price,
  oldPrice: row.oldPrice ?? undefined,
  imageFileId: row.imageFileId ?? undefined,
  imageUrl: row.imageUrl ?? undefined,
  colorTheme: row.colorTheme,
  ctaText: row.ctaText,
  isActive: row.isActive,
  startsAt: row.startsAt ?? undefined,
  endsAt: row.endsAt ?? undefined,
  sortOrder: row.sortOrder ?? 0,
});

export async function getActiveOffers(restaurantId: string): Promise<Offer[]> {
  const rows = await listRows<OfferRow>(TABLES.offers, [
    Query.equal("restaurantId", restaurantId),
    Query.equal("isActive", true),
    Query.orderAsc("sortOrder"),
  ]);

  return rows.map(mapOffer).filter(isWithinOfferWindow);
}
