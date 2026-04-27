import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type { Dish } from "../../types/platform";
import { listRows } from "./readRows";

type DishesRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED" | "WRITE_FAILED" | "DELETE_FAILED";

export class DishesRepositoryError extends Error {
  code: DishesRepositoryErrorCode;

  constructor(message: string, code: DishesRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "DishesRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface DishRow extends Models.Row {
  restaurantId: string;
  name: string;
  description?: string | null;
  price: number;
  oldPrice?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  category: string;
  rating?: number | null;
  isPopular?: boolean | null;
  isAvailable: boolean;
  ingredients?: string[] | string | null;
  sortOrder?: number | null;
}

export type DishMutationInput = {
  name: string;
  description?: string;
  price: number;
  oldPrice?: number;
  imageFileId?: string;
  imageUrl?: string;
  badge?: string;
  category: string;
  rating?: number;
  isPopular: boolean;
  isAvailable: boolean;
  ingredients?: string[];
  sortOrder?: number;
};

type DishRowData = {
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  imageFileId: string | null;
  imageUrl: string | null;
  badge: string | null;
  category: string;
  rating: number | null;
  isPopular: boolean;
  isAvailable: boolean;
  ingredients: string;
  sortOrder: number | null;
};

type DishCreateRowData = DishRowData & {
  restaurantId: string;
};

const parseIngredients = (value: DishRow["ingredients"]): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  }

  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
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
  description: row.description ?? "",
  price: row.price,
  oldPrice: row.oldPrice ?? undefined,
  imageFileId: row.imageFileId ?? undefined,
  imageUrl: row.imageUrl ?? undefined,
  badge: row.badge ?? undefined,
  category: row.category,
  rating: row.rating ?? undefined,
  isPopular: Boolean(row.isPopular),
  isAvailable: row.isAvailable,
  ingredients: parseIngredients(row.ingredients),
  sortOrder: row.sortOrder ?? undefined,
});

const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const optionalNumber = (value: number | undefined) => (typeof value === "number" ? value : null);

const toDishRowData = (input: DishMutationInput): DishRowData => ({
  name: input.name.trim(),
  description: input.description?.trim() ?? "",
  price: input.price,
  oldPrice: optionalNumber(input.oldPrice),
  imageFileId: optionalText(input.imageFileId),
  imageUrl: optionalText(input.imageUrl),
  badge: optionalText(input.badge),
  category: input.category.trim(),
  rating: optionalNumber(input.rating),
  isPopular: input.isPopular,
  isAvailable: input.isAvailable,
  ingredients: JSON.stringify(input.ingredients ?? []),
  sortOrder: optionalNumber(input.sortOrder),
});

// Security note: React-side tenant checks are UX guards only. Before production,
// enforce restaurant-scoped reads/writes with Appwrite Teams/Permissions or Functions.
// Never accept restaurantId from a form/query string and never query all dishes here.
const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new DishesRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new DishesRepositoryError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const assertDishBelongsToRestaurant = async (dishId: string, expectedRestaurantId?: string) => {
  if (!expectedRestaurantId) {
    return;
  }

  assertRestaurantId(expectedRestaurantId);

  try {
    const row = await databases.getRow<DishRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.dishes,
      rowId: dishId,
    });

    if (row.restaurantId !== expectedRestaurantId) {
      throw new DishesRepositoryError("لا يمكن تعديل طبق خارج نطاق المطعم الحالي.", "INVALID_INPUT");
    }
  } catch (error) {
    if (error instanceof DishesRepositoryError) {
      throw error;
    }

    throw new DishesRepositoryError("تعذر التحقق من ملكية الطبق قبل تنفيذ العملية.", "READ_FAILED", error);
  }
};

const getWriteErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر تنفيذ العملية. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر حفظ الطبق. تحقق من الاتصال أو الصلاحيات.";
};

export async function getDishesByRestaurant(restaurantId: string): Promise<Dish[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<DishRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.dishes,
      queries: [Query.equal("restaurantId", restaurantId), Query.orderAsc("sortOrder"), Query.orderDesc("$createdAt")],
    });

    return response.rows.map(mapDish);
  } catch (error) {
    throw new DishesRepositoryError("تعذر تحميل الأطباق. تحقق من الاتصال أو صلاحيات Appwrite.", "READ_FAILED", error);
  }
}

export async function createDish(restaurantId: string, input: DishMutationInput): Promise<Dish> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const row = await databases.createRow<DishRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.dishes,
      rowId: ID.unique(),
      data: {
        ...toDishRowData(input),
        restaurantId,
      } satisfies DishCreateRowData,
    });

    return mapDish(row);
  } catch (error) {
    throw new DishesRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function updateDish(dishId: string, input: DishMutationInput, expectedRestaurantId?: string): Promise<Dish> {
  if (!dishId.trim()) {
    throw new DishesRepositoryError("تعذر تحديد الطبق المطلوب تعديله.", "INVALID_INPUT");
  }

  assertAppwriteDataReady();
  await assertDishBelongsToRestaurant(dishId, expectedRestaurantId);

  try {
    const row = await databases.updateRow<DishRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.dishes,
      rowId: dishId,
      data: toDishRowData(input),
    });

    return mapDish(row);
  } catch (error) {
    throw new DishesRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function toggleDishAvailability(dishId: string, isAvailable: boolean, expectedRestaurantId?: string): Promise<Dish> {
  if (!dishId.trim()) {
    throw new DishesRepositoryError("تعذر تحديد الطبق المطلوب تعديله.", "INVALID_INPUT");
  }

  assertAppwriteDataReady();
  await assertDishBelongsToRestaurant(dishId, expectedRestaurantId);

  try {
    const row = await databases.updateRow<DishRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.dishes,
      rowId: dishId,
      data: { isAvailable },
    });

    return mapDish(row);
  } catch (error) {
    throw new DishesRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function deleteDish(dishId: string, expectedRestaurantId?: string): Promise<void> {
  if (!dishId.trim()) {
    throw new DishesRepositoryError("تعذر تحديد الطبق المطلوب حذفه.", "INVALID_INPUT");
  }

  assertAppwriteDataReady();
  await assertDishBelongsToRestaurant(dishId, expectedRestaurantId);

  try {
    await databases.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.dishes,
      rowId: dishId,
    });
  } catch (error) {
    const message =
      error instanceof AppwriteException && (error.code === 401 || error.code === 403)
        ? "تعذر حذف الطبق. تحقق من تسجيل الدخول أو صلاحيات Appwrite."
        : "تعذر حذف الطبق. تحقق من الاتصال أو الصلاحيات.";

    throw new DishesRepositoryError(message, "DELETE_FAILED", error);
  }
}

export async function getPublicDishes(restaurantId: string): Promise<Dish[]> {
  const rows = await listRows<DishRow>(TABLES.dishes, [
    Query.equal("restaurantId", restaurantId),
    Query.equal("isAvailable", true),
    Query.orderAsc("sortOrder"),
    Query.orderDesc("$createdAt"),
  ]);

  return rows.map(mapDish);
}
