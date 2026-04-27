import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type { GalleryItem } from "../../types/platform";

type GalleryRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED" | "WRITE_FAILED" | "DELETE_FAILED";

export class GalleryRepositoryError extends Error {
  code: GalleryRepositoryErrorCode;

  constructor(message: string, code: GalleryRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "GalleryRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface GalleryItemRow extends Models.Row {
  restaurantId: string;
  title: string;
  alt?: string | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  isVisible: boolean;
  sortOrder?: number | null;
}

export type GalleryItemMutationInput = {
  title: string;
  alt?: string;
  imageFileId?: string;
  imageUrl?: string;
  isVisible: boolean;
  sortOrder?: number;
};

type GalleryItemRowData = {
  title: string;
  alt: string;
  imageFileId: string | null;
  imageUrl: string | null;
  isVisible: boolean;
  sortOrder: number | null;
};

type GalleryItemCreateRowData = GalleryItemRowData & {
  restaurantId: string;
};

const mapGalleryItem = (row: GalleryItemRow): GalleryItem => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  title: row.title,
  alt: row.alt ?? "",
  imageFileId: row.imageFileId ?? undefined,
  imageUrl: row.imageUrl ?? undefined,
  isVisible: row.isVisible,
  sortOrder: row.sortOrder ?? undefined,
});

const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const optionalNumber = (value: number | undefined) => (typeof value === "number" ? value : null);

const toGalleryItemRowData = (input: GalleryItemMutationInput): GalleryItemRowData => ({
  title: input.title.trim(),
  alt: input.alt?.trim() || input.title.trim(),
  imageFileId: optionalText(input.imageFileId),
  imageUrl: optionalText(input.imageUrl),
  isVisible: input.isVisible,
  sortOrder: optionalNumber(input.sortOrder),
});

const sortGalleryItems = (items: GalleryItem[]) =>
  [...items].sort((first, second) => {
    const orderDiff = (first.sortOrder ?? Number.MAX_SAFE_INTEGER) - (second.sortOrder ?? Number.MAX_SAFE_INTEGER);
    return orderDiff || first.title.localeCompare(second.title, "ar");
  });

// Security note: React guards are not final multi-tenant protection.
// Enforce restaurant-scoped gallery writes with Appwrite Teams/Permissions or Functions before production.
// Never accept restaurantId from a form/query string and never query all gallery_items here.
// TODO: Clean up unused uploaded gallery images after failed saves, replacements, or row deletion.
const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new GalleryRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new GalleryRepositoryError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const assertGalleryItemId = (itemId: string) => {
  if (!itemId.trim()) {
    throw new GalleryRepositoryError("تعذر تحديد صورة المعرض المطلوبة.", "INVALID_INPUT");
  }
};

const assertGalleryItemBelongsToRestaurant = async (itemId: string, expectedRestaurantId: string) => {
  assertGalleryItemId(itemId);
  assertRestaurantId(expectedRestaurantId);

  try {
    const row = await databases.getRow<GalleryItemRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.galleryItems,
      rowId: itemId,
    });

    if (row.restaurantId !== expectedRestaurantId) {
      throw new GalleryRepositoryError("لا يمكن تعديل صورة معرض خارج نطاق المطعم الحالي.", "INVALID_INPUT");
    }
  } catch (error) {
    if (error instanceof GalleryRepositoryError) {
      throw error;
    }

    throw new GalleryRepositoryError("تعذر التحقق من ملكية صورة المعرض قبل تنفيذ العملية.", "READ_FAILED", error);
  }
};

const getWriteErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر تنفيذ العملية. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو الصلاحيات.";
};

export async function getGalleryItemsByRestaurant(restaurantId: string): Promise<GalleryItem[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<GalleryItemRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.galleryItems,
      queries: [Query.equal("restaurantId", restaurantId), Query.orderAsc("sortOrder"), Query.orderDesc("$createdAt")],
    });

    return sortGalleryItems(response.rows.map(mapGalleryItem));
  } catch (error) {
    throw new GalleryRepositoryError("تعذر تحميل صور المعرض. تحقق من الاتصال أو صلاحيات Appwrite.", "READ_FAILED", error);
  }
}

export async function getVisibleGalleryItems(restaurantId: string): Promise<GalleryItem[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<GalleryItemRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.galleryItems,
      queries: [
        Query.equal("restaurantId", restaurantId),
        Query.equal("isVisible", true),
        Query.orderAsc("sortOrder"),
        Query.orderDesc("$createdAt"),
      ],
    });

    return sortGalleryItems(response.rows.map(mapGalleryItem));
  } catch (error) {
    throw new GalleryRepositoryError("تعذر تحميل صور المعرض العامة. تحقق من الاتصال أو الصلاحيات.", "READ_FAILED", error);
  }
}

export async function createGalleryItem(restaurantId: string, input: GalleryItemMutationInput): Promise<GalleryItem> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const row = await databases.createRow<GalleryItemRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.galleryItems,
      rowId: ID.unique(),
      data: {
        ...toGalleryItemRowData(input),
        restaurantId,
      } satisfies GalleryItemCreateRowData,
    });

    return mapGalleryItem(row);
  } catch (error) {
    throw new GalleryRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function updateGalleryItem(
  itemId: string,
  input: GalleryItemMutationInput,
  activeRestaurantId: string,
): Promise<GalleryItem> {
  assertAppwriteDataReady();
  await assertGalleryItemBelongsToRestaurant(itemId, activeRestaurantId);

  try {
    const row = await databases.updateRow<GalleryItemRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.galleryItems,
      rowId: itemId,
      data: toGalleryItemRowData(input),
    });

    return mapGalleryItem(row);
  } catch (error) {
    throw new GalleryRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function toggleGalleryItemVisibility(
  itemId: string,
  isVisible: boolean,
  activeRestaurantId: string,
): Promise<GalleryItem> {
  assertAppwriteDataReady();
  await assertGalleryItemBelongsToRestaurant(itemId, activeRestaurantId);

  try {
    const row = await databases.updateRow<GalleryItemRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.galleryItems,
      rowId: itemId,
      data: { isVisible },
    });

    return mapGalleryItem(row);
  } catch (error) {
    throw new GalleryRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function deleteGalleryItem(itemId: string, activeRestaurantId: string): Promise<void> {
  assertAppwriteDataReady();
  await assertGalleryItemBelongsToRestaurant(itemId, activeRestaurantId);

  try {
    await databases.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.galleryItems,
      rowId: itemId,
    });
  } catch (error) {
    const message =
      error instanceof AppwriteException && (error.code === 401 || error.code === 403)
        ? "تعذر حذف صورة المعرض. تحقق من تسجيل الدخول أو صلاحيات Appwrite."
        : "تعذر حذف صورة المعرض. تحقق من الاتصال أو الصلاحيات.";

    throw new GalleryRepositoryError(message, "DELETE_FAILED", error);
  }
}
