import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type { FAQItem } from "../../types/platform";

type FaqRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED" | "WRITE_FAILED" | "DELETE_FAILED";

export class FaqRepositoryError extends Error {
  code: FaqRepositoryErrorCode;

  constructor(message: string, code: FaqRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "FaqRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface FAQRow extends Models.Row {
  restaurantId: string;
  question: string;
  answer: string;
  isVisible: boolean;
  sortOrder?: number | null;
}

export type FaqMutationInput = {
  question: string;
  answer: string;
  isVisible: boolean;
  sortOrder?: number;
};

type FaqRowData = {
  question: string;
  answer: string;
  isVisible: boolean;
  sortOrder: number | null;
};

type FaqCreateRowData = FaqRowData & {
  restaurantId: string;
};

const mapFAQ = (row: FAQRow): FAQItem => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  question: row.question,
  answer: row.answer,
  isVisible: row.isVisible,
  sortOrder: row.sortOrder ?? 0,
});

const optionalNumber = (value: number | undefined) => (typeof value === "number" ? value : null);

const toFaqRowData = (input: FaqMutationInput): FaqRowData => ({
  question: input.question.trim(),
  answer: input.answer.trim(),
  isVisible: input.isVisible,
  sortOrder: optionalNumber(input.sortOrder),
});

// Security note: React guards are not final multi-tenant protection.
// Enforce restaurant-scoped FAQ writes with Appwrite Teams/Permissions or Functions before production.
// Never accept restaurantId from a form and never query FAQs without restaurantId.
const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new FaqRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new FaqRepositoryError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const assertFaqId = (faqId: string) => {
  if (!faqId.trim()) {
    throw new FaqRepositoryError("تعذر تحديد السؤال المطلوب.", "INVALID_INPUT");
  }
};

const assertFaqBelongsToRestaurant = async (faqId: string, expectedRestaurantId?: string) => {
  if (!expectedRestaurantId) {
    return;
  }

  assertRestaurantId(expectedRestaurantId);

  try {
    const row = await databases.getRow<FAQRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.faqs,
      rowId: faqId,
    });

    if (row.restaurantId !== expectedRestaurantId) {
      throw new FaqRepositoryError("لا يمكن تعديل سؤال خارج نطاق المطعم الحالي.", "INVALID_INPUT");
    }
  } catch (error) {
    if (error instanceof FaqRepositoryError) {
      throw error;
    }

    throw new FaqRepositoryError("تعذر التحقق من ملكية السؤال قبل تنفيذ العملية.", "READ_FAILED", error);
  }
};

const getWriteErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر تنفيذ العملية. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر تنفيذ العملية. تحقق من الاتصال أو الصلاحيات.";
};

const sortFaqs = (faqs: FAQItem[]) =>
  [...faqs].sort((first, second) => {
    const orderDiff = (first.sortOrder ?? Number.MAX_SAFE_INTEGER) - (second.sortOrder ?? Number.MAX_SAFE_INTEGER);
    return orderDiff || first.question.localeCompare(second.question, "ar");
  });

export async function getFaqsByRestaurant(restaurantId: string): Promise<FAQItem[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<FAQRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.faqs,
      queries: [Query.equal("restaurantId", restaurantId), Query.orderAsc("sortOrder")],
    });

    return sortFaqs(response.rows.map(mapFAQ));
  } catch (error) {
    throw new FaqRepositoryError("تعذر تحميل الأسئلة الشائعة. تحقق من الاتصال أو الصلاحيات.", "READ_FAILED", error);
  }
}

export async function getVisibleFaqs(restaurantId: string): Promise<FAQItem[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<FAQRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.faqs,
      queries: [Query.equal("restaurantId", restaurantId), Query.equal("isVisible", true), Query.orderAsc("sortOrder")],
    });

    return sortFaqs(response.rows.map(mapFAQ));
  } catch (error) {
    throw new FaqRepositoryError("تعذر تحميل الأسئلة الشائعة. تحقق من الاتصال أو الصلاحيات.", "READ_FAILED", error);
  }
}

export async function createFaq(restaurantId: string, input: FaqMutationInput): Promise<FAQItem> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const row = await databases.createRow<FAQRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.faqs,
      rowId: ID.unique(),
      data: {
        ...toFaqRowData(input),
        restaurantId,
      } satisfies FaqCreateRowData,
    });

    return mapFAQ(row);
  } catch (error) {
    throw new FaqRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function updateFaq(faqId: string, input: FaqMutationInput, expectedRestaurantId?: string): Promise<FAQItem> {
  assertAppwriteDataReady();
  assertFaqId(faqId);
  await assertFaqBelongsToRestaurant(faqId, expectedRestaurantId);

  try {
    const row = await databases.updateRow<FAQRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.faqs,
      rowId: faqId,
      data: toFaqRowData(input),
    });

    return mapFAQ(row);
  } catch (error) {
    throw new FaqRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function toggleFaqVisibility(faqId: string, isVisible: boolean, expectedRestaurantId?: string): Promise<FAQItem> {
  assertAppwriteDataReady();
  assertFaqId(faqId);
  await assertFaqBelongsToRestaurant(faqId, expectedRestaurantId);

  try {
    const row = await databases.updateRow<FAQRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.faqs,
      rowId: faqId,
      data: { isVisible },
    });

    return mapFAQ(row);
  } catch (error) {
    throw new FaqRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function deleteFaq(faqId: string, expectedRestaurantId?: string): Promise<void> {
  assertAppwriteDataReady();
  assertFaqId(faqId);
  await assertFaqBelongsToRestaurant(faqId, expectedRestaurantId);

  try {
    await databases.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.faqs,
      rowId: faqId,
    });
  } catch (error) {
    const message =
      error instanceof AppwriteException && (error.code === 401 || error.code === 403)
        ? "تعذر حذف السؤال. تحقق من تسجيل الدخول أو صلاحيات Appwrite."
        : "تعذر حذف السؤال. تحقق من الاتصال أو الصلاحيات.";

    throw new FaqRepositoryError(message, "DELETE_FAILED", error);
  }
}
