import { Query, type Models } from "appwrite";
import { COLLECTIONS } from "../../lib/appwriteIds";
import type { Dish } from "../../types/platform";
import { listRows } from "./readRows";

interface DishRow extends Models.Row {
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  category: string;
  rating: number;
  isPopular: boolean;
  isAvailable: boolean;
  ingredients?: string[] | string | null;
  sortOrder?: number | null;
}

const parseIngredients = (value: DishRow["ingredients"]): string[] => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const mapDish = (row: DishRow): Dish => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  name: row.name,
  description: row.description,
  price: row.price,
  oldPrice: row.oldPrice ?? undefined,
  imageFileId: row.imageFileId ?? undefined,
  imageUrl: row.imageUrl ?? undefined,
  badge: row.badge ?? undefined,
  category: row.category,
  rating: row.rating,
  isPopular: row.isPopular,
  isAvailable: row.isAvailable,
  ingredients: parseIngredients(row.ingredients),
  sortOrder: row.sortOrder ?? 0,
});

export async function getPublicDishes(restaurantId: string): Promise<Dish[]> {
  const rows = await listRows<DishRow>(COLLECTIONS.dishes, [
    Query.equal("restaurantId", restaurantId),
    Query.equal("isAvailable", true),
    Query.orderAsc("sortOrder"),
  ]);

  return rows.map(mapDish);
}
