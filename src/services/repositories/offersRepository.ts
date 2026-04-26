import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type { ColorTheme, Offer } from "../../types/platform";
import { listRows } from "./readRows";

type OffersRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED" | "WRITE_FAILED" | "DELETE_FAILED";

const COLOR_THEMES = ["orange", "red", "gold"] as const satisfies readonly ColorTheme[];

export class OffersRepositoryError extends Error {
  code: OffersRepositoryErrorCode;

  constructor(message: string, code: OffersRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "OffersRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface OfferRow extends Models.Row {
  restaurantId: string;
  title: string;
  description?: string | null;
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

export type OfferMutationInput = {
  title: string;
  description?: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  colorTheme: ColorTheme;
  ctaText: string;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  sortOrder?: number;
};

type OfferRowData = {
  title: string;
  description: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  colorTheme: ColorTheme;
  ctaText: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number | null;
};

type OfferCreateRowData = OfferRowData & {
  restaurantId: string;
};

const isKnownColorTheme = (value: string): value is ColorTheme => COLOR_THEMES.includes(value as ColorTheme);

const mapOffer = (row: OfferRow): Offer => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  title: row.title,
  description: row.description ?? "",
  price: row.price,
  oldPrice: row.oldPrice ?? undefined,
  imageFileId: row.imageFileId ?? undefined,
  imageUrl: row.imageUrl ?? undefined,
  colorTheme: isKnownColorTheme(row.colorTheme) ? row.colorTheme : "orange",
  ctaText: row.ctaText || "اطلب الآن",
  isActive: row.isActive,
  startsAt: row.startsAt ?? undefined,
  endsAt: row.endsAt ?? undefined,
  sortOrder: row.sortOrder ?? undefined,
});

const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const optionalNumber = (value: number | undefined) => (typeof value === "number" ? value : null);
const optionalDateTime = (value: string | undefined) => (value ? new Date(value).toISOString() : null);

const toOfferRowData = (input: OfferMutationInput): OfferRowData => ({
  title: input.title.trim(),
  description: input.description?.trim() ?? "",
  price: input.price,
  oldPrice: optionalNumber(input.oldPrice),
  imageUrl: optionalText(input.imageUrl),
  colorTheme: input.colorTheme,
  ctaText: input.ctaText.trim() || "اطلب الآن",
  isActive: input.isActive,
  startsAt: optionalDateTime(input.startsAt),
  endsAt: optionalDateTime(input.endsAt),
  sortOrder: optionalNumber(input.sortOrder),
});

// Security note: React guards are not final multi-tenant protection.
// Enforce restaurant-scoped offers writes with Appwrite Teams/Permissions or Functions before production.
// Never accept restaurantId from a form/query string and never query all offers here.
const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new OffersRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new OffersRepositoryError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const assertOfferBelongsToRestaurant = async (offerId: string, expectedRestaurantId?: string) => {
  if (!expectedRestaurantId) {
    return;
  }

  assertRestaurantId(expectedRestaurantId);

  try {
    const row = await databases.getRow<OfferRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.offers,
      rowId: offerId,
    });

    if (row.restaurantId !== expectedRestaurantId) {
      throw new OffersRepositoryError("لا يمكن تعديل عرض خارج نطاق المطعم الحالي.", "INVALID_INPUT");
    }
  } catch (error) {
    if (error instanceof OffersRepositoryError) {
      throw error;
    }

    throw new OffersRepositoryError("تعذر التحقق من ملكية العرض قبل تنفيذ العملية.", "READ_FAILED", error);
  }
};

const getWriteErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر تنفيذ العملية. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو الصلاحيات.";
};

export async function getOffersByRestaurant(restaurantId: string): Promise<Offer[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<OfferRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.offers,
      queries: [Query.equal("restaurantId", restaurantId), Query.orderAsc("sortOrder"), Query.orderDesc("$createdAt")],
    });

    return response.rows.map(mapOffer);
  } catch (error) {
    throw new OffersRepositoryError("تعذر تحميل العروض. تحقق من الاتصال أو صلاحيات Appwrite.", "READ_FAILED", error);
  }
}

export async function createOffer(restaurantId: string, input: OfferMutationInput): Promise<Offer> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const row = await databases.createRow<OfferRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.offers,
      rowId: ID.unique(),
      data: {
        ...toOfferRowData(input),
        restaurantId,
      } satisfies OfferCreateRowData,
    });

    return mapOffer(row);
  } catch (error) {
    throw new OffersRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function updateOffer(offerId: string, input: OfferMutationInput, expectedRestaurantId?: string): Promise<Offer> {
  if (!offerId.trim()) {
    throw new OffersRepositoryError("تعذر تحديد العرض المطلوب تعديله.", "INVALID_INPUT");
  }

  assertAppwriteDataReady();
  await assertOfferBelongsToRestaurant(offerId, expectedRestaurantId);

  try {
    const row = await databases.updateRow<OfferRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.offers,
      rowId: offerId,
      data: toOfferRowData(input),
    });

    return mapOffer(row);
  } catch (error) {
    throw new OffersRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function toggleOfferActive(offerId: string, isActive: boolean, expectedRestaurantId?: string): Promise<Offer> {
  if (!offerId.trim()) {
    throw new OffersRepositoryError("تعذر تحديد العرض المطلوب تعديله.", "INVALID_INPUT");
  }

  assertAppwriteDataReady();
  await assertOfferBelongsToRestaurant(offerId, expectedRestaurantId);

  try {
    const row = await databases.updateRow<OfferRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.offers,
      rowId: offerId,
      data: { isActive },
    });

    return mapOffer(row);
  } catch (error) {
    throw new OffersRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function deleteOffer(offerId: string, expectedRestaurantId?: string): Promise<void> {
  if (!offerId.trim()) {
    throw new OffersRepositoryError("تعذر تحديد العرض المطلوب حذفه.", "INVALID_INPUT");
  }

  assertAppwriteDataReady();
  await assertOfferBelongsToRestaurant(offerId, expectedRestaurantId);

  try {
    await databases.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.offers,
      rowId: offerId,
    });
  } catch (error) {
    const message =
      error instanceof AppwriteException && (error.code === 401 || error.code === 403)
        ? "تعذر حذف العرض. تحقق من تسجيل الدخول أو صلاحيات Appwrite."
        : "تعذر حذف العرض. تحقق من الاتصال أو الصلاحيات.";

    throw new OffersRepositoryError(message, "DELETE_FAILED", error);
  }
}

const isWithinOfferWindow = (offer: Offer) => {
  const now = Date.now();
  const startsAt = offer.startsAt ? Date.parse(offer.startsAt) : null;
  const endsAt = offer.endsAt ? Date.parse(offer.endsAt) : null;

  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
};

export async function getActiveOffers(restaurantId: string): Promise<Offer[]> {
  const rows = await listRows<OfferRow>(TABLES.offers, [
    Query.equal("restaurantId", restaurantId),
    Query.equal("isActive", true),
    Query.orderAsc("sortOrder"),
    Query.orderDesc("$createdAt"),
  ]);

  return rows.map(mapOffer).filter(isWithinOfferWindow);
}
