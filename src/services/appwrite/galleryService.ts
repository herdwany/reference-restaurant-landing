import { Query } from "appwrite";
import type { Models } from "appwrite";
import { TABLES } from "../../lib/appwriteIds";
import type { GalleryItem } from "../../types/appwriteModels";
import { listRows } from "./readRows";

interface GalleryItemRow extends Models.Row {
  restaurantId: string;
  title: string;
  alt: string;
  imageFileId?: string | null;
  imageUrl?: string | null;
  isVisible: boolean;
  sortOrder?: number | null;
}

const mapGalleryItem = (row: GalleryItemRow): GalleryItem => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  title: row.title,
  alt: row.alt,
  imageFileId: row.imageFileId ?? undefined,
  imageUrl: row.imageUrl ?? undefined,
  isVisible: row.isVisible,
  sortOrder: row.sortOrder ?? 0,
});

export async function getVisibleGalleryItems(restaurantId: string): Promise<GalleryItem[]> {
  const rows = await listRows<GalleryItemRow>(TABLES.galleryItems, [
    Query.equal("restaurantId", restaurantId),
    Query.equal("isVisible", true),
    Query.orderAsc("sortOrder"),
  ]);

  return rows.map(mapGalleryItem);
}
