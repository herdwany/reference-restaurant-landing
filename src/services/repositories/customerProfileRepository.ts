import { AppwriteException, ID, Permission, Query, Role, type Models } from "appwrite";
import { COLLECTIONS, DATABASE_ID, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import { databases } from "../../lib/appwriteClient";
import type { CustomerProfile } from "../../types/platform";

type CustomerProfileRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED" | "WRITE_FAILED";

export class CustomerProfileRepositoryError extends Error {
  code: CustomerProfileRepositoryErrorCode;

  constructor(message: string, code: CustomerProfileRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "CustomerProfileRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface CustomerProfileRow extends Models.Row {
  restaurantId: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  defaultAddress?: string | null;
  city?: string | null;
  deliveryNotes?: string | null;
  isActive: boolean;
}

export type CustomerProfileInput = {
  city?: string;
  defaultAddress?: string;
  deliveryNotes?: string;
  email?: string;
  fullName: string;
  phone?: string;
  restaurantId: string;
  userId: string;
};

const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new CustomerProfileRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertScope = (restaurantId: string, userId: string) => {
  if (!restaurantId.trim() || !userId.trim()) {
    throw new CustomerProfileRepositoryError("تعذر تحديد الحساب أو المطعم الحالي.", "INVALID_INPUT");
  }
};

const mapCustomerProfile = (row: CustomerProfileRow): CustomerProfile => ({
  id: row.$id,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  restaurantId: row.restaurantId,
  userId: row.userId,
  fullName: row.fullName,
  phone: row.phone,
  email: row.email ?? undefined,
  defaultAddress: row.defaultAddress ?? undefined,
  city: row.city ?? undefined,
  deliveryNotes: row.deliveryNotes ?? undefined,
  isActive: row.isActive,
});

const getReadMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر تحميل حساب العميل. تحقق من تسجيل الدخول والصلاحيات.";
  }

  return "تعذر تحميل حساب العميل حاليًا.";
};

const getWriteMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر حفظ بيانات الحساب. تحقق من تسجيل الدخول والصلاحيات.";
  }

  return "تعذر حفظ بيانات الحساب حاليًا.";
};

export async function getCustomerProfileByUser(
  restaurantId: string,
  userId: string,
): Promise<CustomerProfile | null> {
  assertAppwriteDataReady();
  assertScope(restaurantId, userId);

  try {
    const response = await databases.listRows<CustomerProfileRow>({
      databaseId: DATABASE_ID,
      tableId: COLLECTIONS.customerProfiles,
      queries: [
        Query.equal("restaurantId", restaurantId),
        Query.equal("userId", userId),
        Query.limit(1),
      ],
    });

    const row = response.rows[0];
    return row ? mapCustomerProfile(row) : null;
  } catch (error) {
    throw new CustomerProfileRepositoryError(getReadMessage(error), "READ_FAILED", error);
  }
}

export async function upsertCustomerProfile(input: CustomerProfileInput): Promise<CustomerProfile> {
  assertAppwriteDataReady();
  assertScope(input.restaurantId, input.userId);

  const existing = await getCustomerProfileByUser(input.restaurantId, input.userId);
  const data = {
    restaurantId: input.restaurantId,
    userId: input.userId,
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() ?? "",
    email: optionalText(input.email),
    defaultAddress: optionalText(input.defaultAddress),
    city: optionalText(input.city),
    deliveryNotes: optionalText(input.deliveryNotes),
    isActive: true,
  };

  if (!data.fullName) {
    throw new CustomerProfileRepositoryError("الاسم مطلوب لحساب العميل.", "INVALID_INPUT");
  }

  try {
    if (existing) {
      const row = await databases.updateRow<CustomerProfileRow>({
        databaseId: DATABASE_ID,
        tableId: COLLECTIONS.customerProfiles,
        rowId: existing.id,
        data,
      });

      return mapCustomerProfile(row);
    }

    const row = await databases.createRow<CustomerProfileRow>({
      databaseId: DATABASE_ID,
      tableId: COLLECTIONS.customerProfiles,
      rowId: ID.unique(),
      data,
      permissions: [
        Permission.read(Role.user(input.userId)),
        Permission.update(Role.user(input.userId)),
        Permission.delete(Role.user(input.userId)),
      ],
    });

    return mapCustomerProfile(row);
  } catch (error) {
    throw new CustomerProfileRepositoryError(getWriteMessage(error), "WRITE_FAILED", error);
  }
}
