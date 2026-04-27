import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
import type { Reservation, ReservationStatus } from "../../types/platform";

type ReservationsRepositoryErrorCode =
  | "APPWRITE_NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "READ_FAILED"
  | "WRITE_FAILED"
  | "DELETE_FAILED";

export class ReservationsRepositoryError extends Error {
  code: ReservationsRepositoryErrorCode;

  constructor(message: string, code: ReservationsRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "ReservationsRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface ReservationRow extends Models.Row {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  peopleCount: number;
  notes?: string | null;
  status: ReservationStatus;
}

export type CreateReservationInput = {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  peopleCount: number;
  notes?: string;
};

type ReservationRowData = {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  peopleCount: number;
  notes: string | null;
  status: ReservationStatus;
};

const reservationStatuses = ["new", "confirmed", "cancelled", "completed"] as const satisfies readonly ReservationStatus[];

const isKnownReservationStatus = (value: string): value is ReservationStatus =>
  reservationStatuses.includes(value as ReservationStatus);

const mapReservation = (row: ReservationRow): Reservation => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  customerName: row.customerName,
  customerPhone: row.customerPhone,
  reservationDate: row.reservationDate,
  reservationTime: row.reservationTime,
  peopleCount: row.peopleCount,
  notes: row.notes ?? undefined,
  status: isKnownReservationStatus(row.status) ? row.status : "new",
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
});

const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new ReservationsRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new ReservationsRepositoryError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const assertReservationId = (reservationId: string) => {
  if (!reservationId.trim()) {
    throw new ReservationsRepositoryError("تعذر تحديد الحجز المطلوب.", "INVALID_INPUT");
  }
};

const assertReservationStatus = (status: ReservationStatus) => {
  if (!isKnownReservationStatus(status)) {
    throw new ReservationsRepositoryError("حالة الحجز غير صالحة.", "INVALID_INPUT");
  }
};

const assertCreateReservationInput = (input: CreateReservationInput) => {
  assertRestaurantId(input.restaurantId);

  if (!input.customerName.trim()) {
    throw new ReservationsRepositoryError("اسم العميل مطلوب لإتمام الحجز.", "INVALID_INPUT");
  }

  if (!input.customerPhone.trim()) {
    throw new ReservationsRepositoryError("رقم هاتف العميل مطلوب لإتمام الحجز.", "INVALID_INPUT");
  }

  if (!input.reservationDate.trim()) {
    throw new ReservationsRepositoryError("تاريخ الحجز مطلوب.", "INVALID_INPUT");
  }

  if (!input.reservationTime.trim()) {
    throw new ReservationsRepositoryError("وقت الحجز مطلوب.", "INVALID_INPUT");
  }

  if (!Number.isFinite(input.peopleCount) || Math.trunc(input.peopleCount) < 1) {
    throw new ReservationsRepositoryError("عدد الأشخاص يجب أن يكون 1 أو أكثر.", "INVALID_INPUT");
  }
};

const toReservationRowData = (input: CreateReservationInput): ReservationRowData => ({
  restaurantId: input.restaurantId,
  customerName: input.customerName.trim(),
  customerPhone: input.customerPhone.trim(),
  reservationDate: input.reservationDate.trim(),
  reservationTime: input.reservationTime.trim(),
  peopleCount: Math.trunc(input.peopleCount),
  notes: optionalText(input.notes),
  status: "new",
});

const getWriteErrorMessage = (error: unknown, action: "create" | "update") => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return action === "create"
      ? "تعذر حفظ الحجز. تحقق من صلاحيات Appwrite أو تابع الحجز عبر واتساب."
      : "تعذر تحديث حالة الحجز. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return action === "create"
    ? "تعذر حفظ الحجز. تحقق من الاتصال أو صلاحيات Appwrite."
    : "تعذر تحديث حالة الحجز. تحقق من الاتصال أو الصلاحيات.";
};

const getReadErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر تحميل الحجوزات. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر تحميل الحجوزات. تحقق من الاتصال أو صلاحيات Appwrite.";
};

const getDeleteErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر حذف الحجز. تحقق من تسجيل الدخول أو صلاحيات Appwrite.";
  }

  return "تعذر حذف الحجز. تحقق من الاتصال أو الصلاحيات.";
};

const assertReservationBelongsToRestaurant = (reservation: Reservation | ReservationRow, activeRestaurantId: string) => {
  assertRestaurantId(activeRestaurantId);

  if (reservation.restaurantId !== activeRestaurantId) {
    throw new ReservationsRepositoryError("لا يمكن إدارة حجز خارج نطاق المطعم الحالي.", "INVALID_INPUT");
  }
};

// TODO: في الإنتاج يجب نقل createReservation إلى Appwrite Function للتحقق من المدخلات،
// منع spam، وضبط permissions قبل تخزين بيانات العملاء من المتصفح.
export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  assertAppwriteDataReady();
  assertCreateReservationInput(input);

  try {
    const row = await databases.createRow<ReservationRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.reservations,
      rowId: ID.unique(),
      data: toReservationRowData(input),
    });

    return mapReservation(row);
  } catch (error) {
    throw new ReservationsRepositoryError(getWriteErrorMessage(error, "create"), "WRITE_FAILED", error);
  }
}

export async function getReservationsByRestaurant(restaurantId: string): Promise<Reservation[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<ReservationRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.reservations,
      queries: [Query.equal("restaurantId", restaurantId), Query.orderDesc("$createdAt")],
    });

    return response.rows.map(mapReservation);
  } catch (error) {
    throw new ReservationsRepositoryError(getReadErrorMessage(error), "READ_FAILED", error);
  }
}

export async function getReservationById(
  reservationId: string,
  activeRestaurantId?: string,
): Promise<Reservation | null> {
  assertAppwriteDataReady();
  assertReservationId(reservationId);

  try {
    if (activeRestaurantId) {
      assertRestaurantId(activeRestaurantId);

      const response = await databases.listRows<ReservationRow>({
        databaseId: DATABASE_ID,
        tableId: TABLES.reservations,
        queries: [Query.equal("restaurantId", activeRestaurantId), Query.equal("$id", reservationId), Query.limit(1)],
      });

      const row = response.rows[0];
      return row ? mapReservation(row) : null;
    }

    const row = await databases.getRow<ReservationRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.reservations,
      rowId: reservationId,
    });

    return mapReservation(row);
  } catch (error) {
    throw new ReservationsRepositoryError(getReadErrorMessage(error), "READ_FAILED", error);
  }
}

export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  activeRestaurantId: string,
): Promise<Reservation> {
  assertAppwriteDataReady();
  assertReservationId(reservationId);
  assertReservationStatus(status);
  assertRestaurantId(activeRestaurantId);

  const existingReservation = await getReservationById(reservationId, activeRestaurantId);

  if (!existingReservation) {
    throw new ReservationsRepositoryError("لا يمكن إدارة حجز خارج نطاق المطعم الحالي.", "INVALID_INPUT");
  }

  assertReservationBelongsToRestaurant(existingReservation, activeRestaurantId);

  try {
    const row = await databases.updateRow<ReservationRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.reservations,
      rowId: reservationId,
      data: { status },
    });

    return mapReservation(row);
  } catch (error) {
    throw new ReservationsRepositoryError(getWriteErrorMessage(error, "update"), "WRITE_FAILED", error);
  }
}

export async function deleteReservation(reservationId: string, activeRestaurantId?: string): Promise<void> {
  assertAppwriteDataReady();
  assertReservationId(reservationId);

  if (activeRestaurantId) {
    const existingReservation = await getReservationById(reservationId, activeRestaurantId);

    if (!existingReservation) {
      throw new ReservationsRepositoryError("لا يمكن حذف حجز خارج نطاق المطعم الحالي.", "INVALID_INPUT");
    }

    assertReservationBelongsToRestaurant(existingReservation, activeRestaurantId);
  }

  try {
    await databases.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.reservations,
      rowId: reservationId,
    });
  } catch (error) {
    throw new ReservationsRepositoryError(getDeleteErrorMessage(error), "DELETE_FAILED", error);
  }
}
