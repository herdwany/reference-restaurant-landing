import { AppwriteException, ExecutionMethod, ID, Query, type Models } from "appwrite";
import { databases, functions } from "../../lib/appwriteClient";
import {
  CREATE_ORDER_FUNCTION_ID,
  DATABASE_ID,
  TABLES,
  canUseDirectSensitiveTableFallback,
  hasAppwriteDataConfig,
  hasCreateOrderFunctionConfig,
} from "../../lib/appwriteIds";
import type { Order, OrderItem, OrderSource, OrderStatus } from "../../types/platform";

type OrdersRepositoryErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "READ_FAILED" | "WRITE_FAILED" | "DELETE_FAILED";

export class OrdersRepositoryError extends Error {
  code: OrdersRepositoryErrorCode;

  constructor(message: string, code: OrdersRepositoryErrorCode, cause?: unknown) {
    super(message);
    this.name = "OrdersRepositoryError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

interface OrderRow extends Models.Row {
  restaurantId: string;
  trackingCode?: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  notes?: string | null;
  totalAmount: number;
  status: OrderStatus;
  source: OrderSource;
  isArchived?: boolean | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
}

interface OrderItemRow extends Models.Row {
  restaurantId: string;
  orderId: string;
  dishId?: string | null;
  dishName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type CreateOrderItemInput = {
  dishId?: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
};

export type CreateOrderInput = {
  restaurantId: string;
  restaurantSlug?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
  deliveryFee?: number;
  source?: OrderSource;
  items: CreateOrderItemInput[];
};

export type OrderWithItems = {
  order: Order;
  items: OrderItem[];
};

export type CreateOrderFunctionResult = {
  itemCount: number;
  orderId: string;
  trackingCode: string;
  source: OrderSource;
  status: OrderStatus;
  totalAmount: number;
};

type OrderRowData = {
  restaurantId: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  notes: string | null;
  totalAmount: number;
  status: OrderStatus;
  source: OrderSource;
  isArchived?: boolean;
};

type OrderItemRowData = {
  restaurantId: string;
  orderId: string;
  dishId: string | null;
  dishName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

const orderStatuses = [
  "new",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
  "rejected",
] as const satisfies readonly OrderStatus[];
const orderSources = ["website", "whatsapp", "admin"] as const satisfies readonly OrderSource[];

const normalizeOrderStatus = (value: string): OrderStatus => {
  if (value === "delivered") {
    return "completed";
  }

  return orderStatuses.includes(value as OrderStatus) ? (value as OrderStatus) : "new";
};

const isKnownOrderSource = (value: string): value is OrderSource => orderSources.includes(value as OrderSource);

const generateTrackingCode = () => `PO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const mapOrder = (row: OrderRow): Order => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  trackingCode: row.trackingCode ?? undefined,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  customerName: row.customerName,
  customerPhone: row.customerPhone,
  customerAddress: row.customerAddress ?? undefined,
  notes: row.notes ?? undefined,
  totalAmount: row.totalAmount,
  status: normalizeOrderStatus(row.status),
  source: isKnownOrderSource(row.source) ? row.source : "website",
  isArchived: row.isArchived === true,
  archivedAt: row.archivedAt ?? undefined,
  archiveReason: row.archiveReason ?? undefined,
});

const mapOrderItem = (row: OrderItemRow): OrderItem => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  orderId: row.orderId,
  dishId: row.dishId ?? undefined,
  dishName: row.dishName,
  quantity: row.quantity,
  unitPrice: row.unitPrice,
  subtotal: row.subtotal,
});

const optionalText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const isArchiveColumnsMissingError = (error: unknown) => {
  if (!(error instanceof AppwriteException) || error.code !== 400) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("isarchived") || message.includes("archivedat") || message.includes("archivereason");
};

const assertAppwriteDataReady = () => {
  if (!hasAppwriteDataConfig) {
    throw new OrdersRepositoryError("لم يتم إعداد Appwrite Database بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new OrdersRepositoryError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const assertOrderId = (orderId: string) => {
  if (!orderId.trim()) {
    throw new OrdersRepositoryError("تعذر تحديد الطلب المطلوب.", "INVALID_INPUT");
  }
};

const assertOrderStatus = (status: OrderStatus) => {
  if (!orderStatuses.includes(status)) {
    throw new OrdersRepositoryError("حالة الطلب غير صالحة.", "INVALID_INPUT");
  }
};

const getWriteErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر حفظ الطلب. تحقق من صلاحيات Appwrite أو تابع الطلب عبر واتساب.";
  }

  return "تعذر حفظ الطلب. تحقق من الاتصال أو صلاحيات Appwrite.";
};

const getReadErrorMessage = (error: unknown) => {
  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر تحميل الطلبات. تحقق من تسجيل الدخول وصلاحيات Appwrite.";
  }

  return "تعذر تحميل الطلبات. تحقق من الاتصال أو صلاحيات Appwrite.";
};

const assertCreateOrderInput = (input: CreateOrderInput) => {
  assertRestaurantId(input.restaurantId);

  if (!input.customerName.trim()) {
    throw new OrdersRepositoryError("اسم العميل مطلوب لإتمام الطلب.", "INVALID_INPUT");
  }

  if (!input.customerPhone.trim()) {
    throw new OrdersRepositoryError("رقم هاتف العميل مطلوب لإتمام الطلب.", "INVALID_INPUT");
  }

  if (input.items.length === 0) {
    throw new OrdersRepositoryError("لا يمكن إنشاء طلب بدون منتجات.", "INVALID_INPUT");
  }

  if (input.source && !isKnownOrderSource(input.source)) {
    throw new OrdersRepositoryError("مصدر الطلب غير صالح.", "INVALID_INPUT");
  }

  for (const item of input.items) {
    if (!item.dishName.trim()) {
      throw new OrdersRepositoryError("اسم المنتج مطلوب داخل عناصر الطلب.", "INVALID_INPUT");
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new OrdersRepositoryError("كمية المنتج يجب أن تكون أكبر من صفر.", "INVALID_INPUT");
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new OrdersRepositoryError("سعر المنتج غير صالح.", "INVALID_INPUT");
    }
  }
};

const assertCreateOrderFunctionInput = (input: CreateOrderInput) => {
  if (!hasCreateOrderFunctionConfig) {
    throw new OrdersRepositoryError("لم يتم ضبط Appwrite Function لإنشاء الطلبات بعد.", "APPWRITE_NOT_CONFIGURED");
  }

  if (!input.restaurantSlug?.trim()) {
    throw new OrdersRepositoryError("تعذر تحديد رابط المطعم لإرسال الطلب.", "INVALID_INPUT");
  }

  if (!input.customerName.trim()) {
    throw new OrdersRepositoryError("اسم العميل مطلوب لإتمام الطلب.", "INVALID_INPUT");
  }

  if (!input.customerPhone.trim()) {
    throw new OrdersRepositoryError("رقم هاتف العميل مطلوب لإتمام الطلب.", "INVALID_INPUT");
  }

  if (input.items.length === 0) {
    throw new OrdersRepositoryError("لا يمكن إنشاء طلب بدون منتجات.", "INVALID_INPUT");
  }

  for (const item of input.items) {
    if (!item.dishName.trim()) {
      throw new OrdersRepositoryError("اسم المنتج مطلوب داخل عناصر الطلب.", "INVALID_INPUT");
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new OrdersRepositoryError("كمية المنتج يجب أن تكون أكبر من صفر.", "INVALID_INPUT");
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
      throw new OrdersRepositoryError("سعر المنتج غير صالح.", "INVALID_INPUT");
    }
  }
};

const normalizeOrderItem = (item: CreateOrderItemInput): CreateOrderItemInput & { subtotal: number } => {
  const quantity = Math.trunc(item.quantity);
  const unitPrice = Number(item.unitPrice);
  const subtotal = unitPrice * quantity;

  return {
    ...item,
    quantity,
    unitPrice,
    subtotal,
  };
};

const getTotalAmount = (items: readonly (CreateOrderItemInput & { subtotal: number })[], deliveryFee: number | undefined) => {
  const itemsTotal = items.reduce((total, item) => total + item.subtotal, 0);
  const safeDeliveryFee = typeof deliveryFee === "number" && Number.isFinite(deliveryFee) && deliveryFee > 0 ? deliveryFee : 0;
  return itemsTotal + safeDeliveryFee;
};

const toOrderRowData = (input: CreateOrderInput, totalAmount: number): OrderRowData => ({
  restaurantId: input.restaurantId,
  trackingCode: generateTrackingCode(),
  customerName: input.customerName.trim(),
  customerPhone: input.customerPhone.trim(),
  customerAddress: optionalText(input.customerAddress),
  notes: optionalText(input.notes),
  totalAmount,
  status: "new",
  source: input.source ?? "website",
  isArchived: false,
});

const toOrderItemRowData = (restaurantId: string, orderId: string, item: CreateOrderItemInput & { subtotal: number }): OrderItemRowData => ({
  restaurantId,
  orderId,
  dishId: optionalText(item.dishId),
  dishName: item.dishName.trim(),
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  subtotal: item.subtotal,
});

const getOrderRowOrThrow = async (orderId: string) => {
  assertOrderId(orderId);

  try {
    return await databases.getRow<OrderRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.orders,
      rowId: orderId,
    });
  } catch (error) {
    throw new OrdersRepositoryError(getReadErrorMessage(error), "READ_FAILED", error);
  }
};

const getCreateOrderFunctionErrorMessage = (body: string | undefined) => {
  if (!body) {
    return "تعذر إنشاء الطلب عبر Appwrite Function.";
  }

  try {
    const parsed: unknown = JSON.parse(body);

    if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return body;
  }

  return "تعذر إنشاء الطلب عبر Appwrite Function.";
};

const parseCreateOrderFunctionResult = (body: string): CreateOrderFunctionResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    throw new OrdersRepositoryError("استجابة Appwrite Function غير صالحة.", "WRITE_FAILED", error);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new OrdersRepositoryError("استجابة Appwrite Function غير صالحة.", "WRITE_FAILED");
  }

  const result = parsed as Partial<CreateOrderFunctionResult> & { ok?: boolean };

  if (!result.ok || !result.orderId || typeof result.totalAmount !== "number" || typeof result.itemCount !== "number") {
    throw new OrdersRepositoryError("Appwrite Function لم تُرجع ملخص طلب صالح.", "WRITE_FAILED");
  }

  const status = typeof result.status === "string" ? normalizeOrderStatus(result.status) : "new";

  return {
    itemCount: result.itemCount,
    orderId: result.orderId,
    trackingCode: typeof result.trackingCode === "string" ? result.trackingCode : "",
    source: result.source === "admin" || result.source === "whatsapp" ? result.source : "website",
    status,
    totalAmount: result.totalAmount,
  };
};

export { hasCreateOrderFunctionConfig };

const assertOrderBelongsToRestaurant = (order: OrderRow | Order, expectedRestaurantId?: string) => {
  if (!expectedRestaurantId) {
    return;
  }

  assertRestaurantId(expectedRestaurantId);

  if (order.restaurantId !== expectedRestaurantId) {
    throw new OrdersRepositoryError("لا يمكن إدارة طلب خارج نطاق المطعم الحالي.", "INVALID_INPUT");
  }
};

export async function createOrderViaFunction(input: CreateOrderInput): Promise<CreateOrderFunctionResult> {
  assertCreateOrderFunctionInput(input);

  const functionPayload = {
    restaurantSlug: input.restaurantSlug?.trim(),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerAddress: input.customerAddress?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    deliveryFee: input.deliveryFee,
    source: "website",
    items: input.items.map((item) => ({
      dishId: item.dishId?.trim() || undefined,
      dishName: item.dishName.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };

  try {
    const execution = await functions.createExecution({
      functionId: CREATE_ORDER_FUNCTION_ID,
      body: JSON.stringify(functionPayload),
      async: false,
      method: ExecutionMethod.POST,
      headers: {
        "content-type": "application/json",
      },
    });

    if (execution.status !== "completed" || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
      throw new OrdersRepositoryError(getCreateOrderFunctionErrorMessage(execution.responseBody), "WRITE_FAILED");
    }

    return parseCreateOrderFunctionResult(execution.responseBody);
  } catch (error) {
    if (error instanceof OrdersRepositoryError) {
      throw error;
    }

    throw new OrdersRepositoryError("تعذر إنشاء الطلب عبر Appwrite Function. يمكنك متابعة الطلب عبر واتساب.", "WRITE_FAILED", error);
  }
}

// Development/staging fallback only. Production should prefer createOrderViaFunction, then remove public create
// permissions from orders/order_items after the Function is verified.
export async function createOrder(input: CreateOrderInput): Promise<OrderWithItems> {
  if (!canUseDirectSensitiveTableFallback) {
    throw new OrdersRepositoryError("لا يمكن إنشاء الطلب مباشرة من المتصفح في بيئة الإنتاج.", "APPWRITE_NOT_CONFIGURED");
  }

  assertAppwriteDataReady();
  assertCreateOrderInput(input);

  const items = input.items.map(normalizeOrderItem);
  const totalAmount = getTotalAmount(items, input.deliveryFee);

  try {
    let orderRow: OrderRow;

    try {
      orderRow = await databases.createRow<OrderRow>({
        databaseId: DATABASE_ID,
        tableId: TABLES.orders,
        rowId: ID.unique(),
        data: toOrderRowData(input, totalAmount),
      });
    } catch (error) {
      if (!isArchiveColumnsMissingError(error)) {
        throw error;
      }

      const { isArchived: _isArchived, ...fallbackOrderData } = toOrderRowData(input, totalAmount);
      orderRow = await databases.createRow<OrderRow>({
        databaseId: DATABASE_ID,
        tableId: TABLES.orders,
        rowId: ID.unique(),
        data: fallbackOrderData,
      });
    }

    const orderItems = await Promise.all(
      items.map((item) =>
        databases.createRow<OrderItemRow>({
          databaseId: DATABASE_ID,
          tableId: TABLES.orderItems,
          rowId: ID.unique(),
          data: toOrderItemRowData(input.restaurantId, orderRow.$id, item),
        }),
      ),
    );

    return {
      order: mapOrder(orderRow),
      items: orderItems.map(mapOrderItem),
    };
  } catch (error) {
    throw new OrdersRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<OrderRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.orders,
      queries: [Query.equal("restaurantId", restaurantId), Query.equal("isArchived", false), Query.orderDesc("$createdAt")],
    });

    return response.rows.map(mapOrder);
  } catch (error) {
    if (isArchiveColumnsMissingError(error)) {
      const response = await databases.listRows<OrderRow>({
        databaseId: DATABASE_ID,
        tableId: TABLES.orders,
        queries: [Query.equal("restaurantId", restaurantId), Query.orderDesc("$createdAt")],
      });

      return response.rows.map(mapOrder).filter((order) => !order.isArchived);
    }

    throw new OrdersRepositoryError(getReadErrorMessage(error), "READ_FAILED", error);
  }
}

export async function getArchivedOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
  assertAppwriteDataReady();
  assertRestaurantId(restaurantId);

  try {
    const response = await databases.listRows<OrderRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.orders,
      queries: [Query.equal("restaurantId", restaurantId), Query.equal("isArchived", true), Query.orderDesc("$updatedAt")],
    });

    return response.rows.map(mapOrder);
  } catch (error) {
    if (isArchiveColumnsMissingError(error)) {
      return [];
    }

    throw new OrdersRepositoryError(getReadErrorMessage(error), "READ_FAILED", error);
  }
}

export async function getOrderItems(orderId: string, restaurantId?: string): Promise<OrderItem[]> {
  assertAppwriteDataReady();
  assertOrderId(orderId);

  const scopedRestaurantId = restaurantId ?? (await getOrderRowOrThrow(orderId)).restaurantId;
  assertRestaurantId(scopedRestaurantId);

  try {
    const response = await databases.listRows<OrderItemRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.orderItems,
      queries: [Query.equal("restaurantId", scopedRestaurantId), Query.equal("orderId", orderId), Query.orderAsc("$createdAt")],
    });

    return response.rows.map(mapOrderItem);
  } catch (error) {
    throw new OrdersRepositoryError(getReadErrorMessage(error), "READ_FAILED", error);
  }
}

export async function getOrderWithItems(orderId: string, activeRestaurantId?: string): Promise<OrderWithItems> {
  assertAppwriteDataReady();
  const orderRow = await getOrderRowOrThrow(orderId);
  assertOrderBelongsToRestaurant(orderRow, activeRestaurantId);

  const items = await getOrderItems(orderId, orderRow.restaurantId);

  return {
    order: mapOrder(orderRow),
    items,
  };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, activeRestaurantId?: string): Promise<Order> {
  assertAppwriteDataReady();
  assertOrderId(orderId);
  assertOrderStatus(status);

  const existingOrder = await getOrderRowOrThrow(orderId);
  assertOrderBelongsToRestaurant(existingOrder, activeRestaurantId);

  if (existingOrder.isArchived === true) {
    throw new OrdersRepositoryError("لا يمكن تغيير حالة طلب مؤرشف. استعده أولًا.", "INVALID_INPUT");
  }

  try {
    const row = await databases.updateRow<OrderRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.orders,
      rowId: orderId,
      data: { status },
    });

    return mapOrder(row);
  } catch (error) {
    throw new OrdersRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function archiveOrder(orderId: string, restaurantId: string, reason?: string): Promise<Order> {
  assertAppwriteDataReady();
  assertOrderId(orderId);
  assertRestaurantId(restaurantId);

  const existingOrder = await getOrderRowOrThrow(orderId);
  assertOrderBelongsToRestaurant(existingOrder, restaurantId);

  try {
    const row = await databases.updateRow<OrderRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.orders,
      rowId: orderId,
      data: {
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archiveReason: optionalText(reason),
      },
    });

    return mapOrder(row);
  } catch (error) {
    throw new OrdersRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function restoreOrder(orderId: string, restaurantId: string): Promise<Order> {
  assertAppwriteDataReady();
  assertOrderId(orderId);
  assertRestaurantId(restaurantId);

  const existingOrder = await getOrderRowOrThrow(orderId);
  assertOrderBelongsToRestaurant(existingOrder, restaurantId);

  try {
    const row = await databases.updateRow<OrderRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.orders,
      rowId: orderId,
      data: {
        isArchived: false,
        archivedAt: null,
        archiveReason: null,
      },
    });

    return mapOrder(row);
  } catch (error) {
    throw new OrdersRepositoryError(getWriteErrorMessage(error), "WRITE_FAILED", error);
  }
}

export async function deleteOrder(orderId: string, activeRestaurantId?: string): Promise<void> {
  assertAppwriteDataReady();
  assertOrderId(orderId);

  if (!activeRestaurantId) {
    throw new OrdersRepositoryError("تعذر تحديد المطعم الحالي لأرشفة الطلب.", "INVALID_INPUT");
  }

  const existingOrder = await getOrderRowOrThrow(orderId);
  assertOrderBelongsToRestaurant(existingOrder, activeRestaurantId);

  await archiveOrder(orderId, activeRestaurantId, "legacy_delete_action");
}
