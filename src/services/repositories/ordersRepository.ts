import { AppwriteException, ID, Query, type Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, TABLES, hasAppwriteDataConfig } from "../../lib/appwriteIds";
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
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  notes?: string | null;
  totalAmount: number;
  status: OrderStatus;
  source: OrderSource;
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

type OrderRowData = {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  notes: string | null;
  totalAmount: number;
  status: OrderStatus;
  source: OrderSource;
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

const orderStatuses = ["new", "confirmed", "preparing", "ready", "delivered", "cancelled"] as const satisfies readonly OrderStatus[];
const orderSources = ["website", "whatsapp", "admin"] as const satisfies readonly OrderSource[];

const isKnownOrderStatus = (value: string): value is OrderStatus => orderStatuses.includes(value as OrderStatus);
const isKnownOrderSource = (value: string): value is OrderSource => orderSources.includes(value as OrderSource);

const mapOrder = (row: OrderRow): Order => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  customerName: row.customerName,
  customerPhone: row.customerPhone,
  customerAddress: row.customerAddress ?? undefined,
  notes: row.notes ?? undefined,
  totalAmount: row.totalAmount,
  status: isKnownOrderStatus(row.status) ? row.status : "new",
  source: isKnownOrderSource(row.source) ? row.source : "website",
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
  if (!isKnownOrderStatus(status)) {
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
  customerName: input.customerName.trim(),
  customerPhone: input.customerPhone.trim(),
  customerAddress: optionalText(input.customerAddress),
  notes: optionalText(input.notes),
  totalAmount,
  status: "new",
  source: input.source ?? "website",
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

const assertOrderBelongsToRestaurant = (order: OrderRow | Order, expectedRestaurantId?: string) => {
  if (!expectedRestaurantId) {
    return;
  }

  assertRestaurantId(expectedRestaurantId);

  if (order.restaurantId !== expectedRestaurantId) {
    throw new OrdersRepositoryError("لا يمكن إدارة طلب خارج نطاق المطعم الحالي.", "INVALID_INPUT");
  }
};

// TODO: في الإنتاج يجب نقل createOrder إلى Appwrite Function للتحقق من المدخلات،
// إعادة حساب الأسعار من قاعدة البيانات، منع spam، وضبط permissions بدون أسرار داخل React.
export async function createOrder(input: CreateOrderInput): Promise<OrderWithItems> {
  assertAppwriteDataReady();
  assertCreateOrderInput(input);

  const items = input.items.map(normalizeOrderItem);
  const totalAmount = getTotalAmount(items, input.deliveryFee);

  try {
    const orderRow = await databases.createRow<OrderRow>({
      databaseId: DATABASE_ID,
      tableId: TABLES.orders,
      rowId: ID.unique(),
      data: toOrderRowData(input, totalAmount),
    });

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
      queries: [Query.equal("restaurantId", restaurantId), Query.orderDesc("$createdAt")],
    });

    return response.rows.map(mapOrder);
  } catch (error) {
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

export async function deleteOrder(orderId: string, activeRestaurantId?: string): Promise<void> {
  assertAppwriteDataReady();
  assertOrderId(orderId);

  const existingOrder = await getOrderRowOrThrow(orderId);
  assertOrderBelongsToRestaurant(existingOrder, activeRestaurantId);

  try {
    const items = await getOrderItems(orderId, existingOrder.restaurantId);
    await Promise.all(
      items.map((item) =>
        databases.deleteRow({
          databaseId: DATABASE_ID,
          tableId: TABLES.orderItems,
          rowId: item.id,
        }),
      ),
    );

    await databases.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.orders,
      rowId: orderId,
    });
  } catch (error) {
    const message =
      error instanceof AppwriteException && (error.code === 401 || error.code === 403)
        ? "تعذر حذف الطلب. تحقق من تسجيل الدخول وصلاحيات Appwrite."
        : "تعذر حذف الطلب. تحقق من الاتصال أو صلاحيات Appwrite.";

    throw new OrdersRepositoryError(message, "DELETE_FAILED", error);
  }
}
