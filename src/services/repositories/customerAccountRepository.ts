import { AppwriteException, ExecutionMethod } from "appwrite";
import { functions } from "../../lib/appwriteClient";
import {
  CUSTOMER_ACCOUNT_FUNCTION_ID,
  canUseDirectSensitiveTableFallback,
  hasCustomerAccountFunctionConfig,
} from "../../lib/appwriteIds";
import type { Order, OrderItem, Reservation } from "../../types/platform";
import { getOrderItems, getOrdersByCustomer } from "./ordersRepository";
import { getReservationsByCustomer } from "./reservationsRepository";

type CustomerAccountRepositoryErrorCode =
  | "APPWRITE_NOT_CONFIGURED"
  | "FUNCTION_PERMISSION_DENIED"
  | "INVALID_INPUT"
  | "READ_FAILED";

export class CustomerAccountRepositoryError extends Error {
  code: CustomerAccountRepositoryErrorCode;

  constructor(message: string, code: CustomerAccountRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "CustomerAccountRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

export type CustomerAccountHistory = {
  orders: Order[];
  reservations: Reservation[];
};

type CustomerAccountScope = {
  restaurantId: string;
  restaurantSlug: string;
  userId: string;
};

const CUSTOMER_ACCOUNT_FUNCTION_PERMISSION_MESSAGE =
  "لا يمكن تحميل حسابك حاليًا. تأكد من تسجيل الدخول أو صلاحيات دالة حساب العميل.";

const assertScope = ({ restaurantId, restaurantSlug, userId }: CustomerAccountScope) => {
  if (!restaurantId.trim() || !restaurantSlug.trim() || !userId.trim()) {
    throw new CustomerAccountRepositoryError("تعذر تحديد حساب العميل أو المطعم الحالي.", "INVALID_INPUT");
  }
};

const getFunctionErrorMessage = (body: string | undefined) => {
  if (!body) {
    return "تعذر تحميل بيانات الحساب حاليا.";
  }

  try {
    const parsed: unknown = JSON.parse(body);

    if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return body;
  }

  return "تعذر تحميل بيانات الحساب حاليا.";
};

const callCustomerAccountFunction = async <Result>(payload: Record<string, unknown>): Promise<Result> => {
  if (!hasCustomerAccountFunctionConfig) {
    throw new CustomerAccountRepositoryError("لم يتم ضبط Appwrite Function لحساب العميل بعد.", "APPWRITE_NOT_CONFIGURED");
  }

  try {
    const execution = await functions.createExecution({
      functionId: CUSTOMER_ACCOUNT_FUNCTION_ID,
      body: JSON.stringify(payload),
      async: false,
      method: ExecutionMethod.POST,
      headers: {
        "content-type": "application/json",
      },
    });

    if (execution.responseStatusCode === 401 || execution.responseStatusCode === 403) {
      throw new CustomerAccountRepositoryError(
        CUSTOMER_ACCOUNT_FUNCTION_PERMISSION_MESSAGE,
        "FUNCTION_PERMISSION_DENIED",
      );
    }

    if (execution.status !== "completed" || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
      throw new CustomerAccountRepositoryError(getFunctionErrorMessage(execution.responseBody), "READ_FAILED");
    }

    const parsed: unknown = JSON.parse(execution.responseBody);

    if (!parsed || typeof parsed !== "object" || !("ok" in parsed) || parsed.ok !== true) {
      throw new CustomerAccountRepositoryError("استجابة Appwrite Function غير صالحة.", "READ_FAILED");
    }

    return parsed as Result;
  } catch (error) {
    if (error instanceof CustomerAccountRepositoryError) {
      throw error;
    }

    if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
      throw new CustomerAccountRepositoryError(
        CUSTOMER_ACCOUNT_FUNCTION_PERMISSION_MESSAGE,
        "FUNCTION_PERMISSION_DENIED",
        error,
      );
    }

    throw new CustomerAccountRepositoryError("تعذر تحميل بيانات الحساب حاليا.", "READ_FAILED", error);
  }
};

export async function getCustomerAccountHistory(scope: CustomerAccountScope): Promise<CustomerAccountHistory> {
  assertScope(scope);

  if (hasCustomerAccountFunctionConfig) {
    const result = await callCustomerAccountFunction<CustomerAccountHistory & { ok: true }>({
      action: "history",
      restaurantSlug: scope.restaurantSlug,
    });

    return {
      orders: Array.isArray(result.orders) ? result.orders : [],
      reservations: Array.isArray(result.reservations) ? result.reservations : [],
    };
  }

  if (!canUseDirectSensitiveTableFallback) {
    throw new CustomerAccountRepositoryError("لم يتم ضبط Appwrite Function لحساب العميل بعد.", "APPWRITE_NOT_CONFIGURED");
  }

  const [orders, reservations] = await Promise.all([
    getOrdersByCustomer(scope.restaurantId, scope.userId),
    getReservationsByCustomer(scope.restaurantId, scope.userId),
  ]);

  return { orders, reservations };
}

export async function getCustomerOrderItemsForReorder(
  scope: CustomerAccountScope,
  orderId: string,
): Promise<OrderItem[]> {
  assertScope(scope);

  if (!orderId.trim()) {
    throw new CustomerAccountRepositoryError("تعذر تحديد الطلب المطلوب.", "INVALID_INPUT");
  }

  if (hasCustomerAccountFunctionConfig) {
    const result = await callCustomerAccountFunction<{ items?: OrderItem[]; ok: true }>({
      action: "orderItems",
      orderId,
      restaurantSlug: scope.restaurantSlug,
    });

    return Array.isArray(result.items) ? result.items : [];
  }

  if (!canUseDirectSensitiveTableFallback) {
    throw new CustomerAccountRepositoryError("لم يتم ضبط Appwrite Function لحساب العميل بعد.", "APPWRITE_NOT_CONFIGURED");
  }

  return await getOrderItems(orderId, scope.restaurantId);
}
