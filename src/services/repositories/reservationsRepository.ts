import { AppwriteException, ExecutionMethod, ID, Query, type Models } from "appwrite";
import { databases, functions } from "../../lib/appwriteClient";
import {
  CREATE_RESERVATION_FUNCTION_ID,
  DATABASE_ID,
  TABLES,
  hasAppwriteDataConfig,
  hasCreateReservationFunctionConfig,
  isProductionBuild,
} from "../../lib/appwriteIds";
import type { DepositStatus, Reservation, ReservationStatus } from "../../types/platform";

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
  trackingCode?: string | null;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  peopleCount: number;
  notes?: string | null;
  status: ReservationStatus;
  depositStatus?: DepositStatus | null;
  depositAmount?: number | null;
  depositNotes?: string | null;
  confirmationNotes?: string | null;
  policyAccepted?: boolean | null;
}

export type CreateReservationInput = {
  restaurantId: string;
  restaurantSlug?: string;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  peopleCount: number;
  notes?: string;
  policyAccepted?: boolean;
  status?: ReservationStatus;
  depositStatus?: DepositStatus;
  depositAmount?: number;
};

export type CreateReservationFunctionResult = {
  peopleCount: number;
  reservationDate: string;
  reservationId: string;
  trackingCode: string;
  reservationTime: string;
  source: "website";
  status: ReservationStatus;
};

type ReservationRowData = {
  restaurantId: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  peopleCount: number;
  notes: string | null;
  status: ReservationStatus;
  depositStatus: DepositStatus;
  depositAmount: number | null;
  depositNotes: string | null;
  confirmationNotes: string | null;
  policyAccepted: boolean;
};

const reservationStatuses = [
  "new",
  "pending_confirmation",
  "confirmed",
  "deposit_required",
  "deposit_paid",
  "seated",
  "completed",
  "no_show",
  "cancelled",
  "rejected",
] as const satisfies readonly ReservationStatus[];
const depositStatuses = ["none", "required", "paid", "waived"] as const satisfies readonly DepositStatus[];

const normalizeReservationStatus = (value: string): ReservationStatus =>
  reservationStatuses.includes(value as ReservationStatus) ? (value as ReservationStatus) : "new";

const normalizeDepositStatus = (value: string | null | undefined): DepositStatus =>
  depositStatuses.includes(value as DepositStatus) ? (value as DepositStatus) : "none";

const generateTrackingCode = () => `RS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const mapReservation = (row: ReservationRow): Reservation => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  trackingCode: row.trackingCode ?? undefined,
  customerName: row.customerName,
  customerPhone: row.customerPhone,
  reservationDate: row.reservationDate,
  reservationTime: row.reservationTime,
  peopleCount: row.peopleCount,
  notes: row.notes ?? undefined,
  status: normalizeReservationStatus(row.status),
  depositStatus: normalizeDepositStatus(row.depositStatus),
  depositAmount: row.depositAmount ?? undefined,
  depositNotes: row.depositNotes ?? undefined,
  confirmationNotes: row.confirmationNotes ?? undefined,
  policyAccepted: row.policyAccepted ?? undefined,
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
  if (!reservationStatuses.includes(status)) {
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

const assertCreateReservationFunctionInput = (input: CreateReservationInput) => {
  if (!hasCreateReservationFunctionConfig) {
    throw new ReservationsRepositoryError("لم يتم ضبط Appwrite Function لإنشاء الحجوزات بعد.", "APPWRITE_NOT_CONFIGURED");
  }

  if (!input.restaurantSlug?.trim()) {
    throw new ReservationsRepositoryError("تعذر تحديد رابط المطعم لإرسال الحجز.", "INVALID_INPUT");
  }

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
  trackingCode: generateTrackingCode(),
  customerName: input.customerName.trim(),
  customerPhone: input.customerPhone.trim(),
  reservationDate: input.reservationDate.trim(),
  reservationTime: input.reservationTime.trim(),
  peopleCount: Math.trunc(input.peopleCount),
  notes: optionalText(input.notes),
  status: input.status ?? "new",
  depositStatus: input.depositStatus ?? "none",
  depositAmount: typeof input.depositAmount === "number" ? input.depositAmount : null,
  depositNotes: null,
  confirmationNotes: null,
  policyAccepted: Boolean(input.policyAccepted),
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

const getCreateReservationFunctionErrorMessage = (body: string | undefined) => {
  if (!body) {
    return "تعذر إنشاء الحجز عبر Appwrite Function.";
  }

  try {
    const parsed: unknown = JSON.parse(body);

    if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return body;
  }

  return "تعذر إنشاء الحجز عبر Appwrite Function.";
};

const parseCreateReservationFunctionResult = (body: string): CreateReservationFunctionResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new ReservationsRepositoryError("استجابة Appwrite Function غير صالحة.", "WRITE_FAILED", error);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ReservationsRepositoryError("استجابة Appwrite Function غير صالحة.", "WRITE_FAILED");
  }

  const result = parsed as Partial<CreateReservationFunctionResult> & { ok?: boolean };

  if (
    !result.ok ||
    !result.reservationId ||
    !result.reservationDate ||
    !result.reservationTime ||
    typeof result.peopleCount !== "number"
  ) {
    throw new ReservationsRepositoryError("Appwrite Function لم تُرجع ملخص حجز صالح.", "WRITE_FAILED");
  }

  const status = typeof result.status === "string" ? normalizeReservationStatus(result.status) : "new";

  return {
    peopleCount: result.peopleCount,
    reservationDate: result.reservationDate,
    reservationId: result.reservationId,
    trackingCode: typeof result.trackingCode === "string" ? result.trackingCode : "",
    reservationTime: result.reservationTime,
    source: "website",
    status,
  };
};

export { hasCreateReservationFunctionConfig };

export async function createReservationViaFunction(input: CreateReservationInput): Promise<CreateReservationFunctionResult> {
  assertCreateReservationFunctionInput(input);

  const functionPayload = {
    restaurantSlug: input.restaurantSlug?.trim(),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    reservationDate: input.reservationDate.trim(),
    reservationTime: input.reservationTime.trim(),
    peopleCount: Math.trunc(input.peopleCount),
    notes: input.notes?.trim() || undefined,
    policyAccepted: Boolean(input.policyAccepted),
    source: "website",
  };

  try {
    const execution = await functions.createExecution({
      functionId: CREATE_RESERVATION_FUNCTION_ID,
      body: JSON.stringify(functionPayload),
      async: false,
      method: ExecutionMethod.POST,
      headers: {
        "content-type": "application/json",
      },
    });

    if (execution.status !== "completed" || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
      throw new ReservationsRepositoryError(getCreateReservationFunctionErrorMessage(execution.responseBody), "WRITE_FAILED");
    }

    return parseCreateReservationFunctionResult(execution.responseBody);
  } catch (error) {
    if (error instanceof ReservationsRepositoryError) {
      throw error;
    }

    throw new ReservationsRepositoryError("تعذر إنشاء الحجز عبر Appwrite Function. يمكنك متابعة الحجز عبر واتساب.", "WRITE_FAILED", error);
  }
}

// Staging fallback only. Production should prefer createReservationViaFunction, then remove
// public create permissions from reservations after the Function is verified.
export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  if (isProductionBuild) {
    throw new ReservationsRepositoryError("لا يمكن إنشاء الحجز مباشرة من المتصفح في بيئة الإنتاج.", "APPWRITE_NOT_CONFIGURED");
  }

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
    const data =
      status === "deposit_paid"
        ? { status, depositStatus: "paid" as DepositStatus }
        : status === "deposit_required"
          ? { status, depositStatus: "required" as DepositStatus }
          : { status };

    const row = await databases.updateRow<ReservationRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.reservations,
      rowId: reservationId,
      data,
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
