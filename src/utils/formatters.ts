import type { BookingFormData, CartItem } from "../data/restaurantConfig";

export type OrderMessageCustomerDetails = {
  customerAddress?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
};

export const formatPrice = (value: number, currency: string) =>
  `${new Intl.NumberFormat("ar-SA").format(value)} ${currency}`;

export const normalizeWhatsappNumber = (number: string) => number.replace(/[^\d]/g, "");

export const createWhatsappUrl = (number: string, message: string) =>
  `https://wa.me/${normalizeWhatsappNumber(number)}?text=${encodeURIComponent(message)}`;

export const getCartSubtotal = (items: CartItem[]) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);

export const getCartQuantity = (items: CartItem[]) =>
  items.reduce((total, item) => total + item.quantity, 0);

export const createOrderMessage = (
  restaurantName: string,
  items: CartItem[],
  currency: string,
  deliveryFee: number,
  customer?: OrderMessageCustomerDetails,
) => {
  const subtotal = getCartSubtotal(items);
  const total = subtotal + deliveryFee;
  const customerLines = customer
    ? [
        customer.customerName ? `الاسم: ${customer.customerName}` : null,
        customer.customerPhone ? `الهاتف: ${customer.customerPhone}` : null,
        customer.customerAddress ? `العنوان: ${customer.customerAddress}` : null,
        customer.notes ? `ملاحظات: ${customer.notes}` : null,
      ].filter((line): line is string => Boolean(line))
    : [];
  const lines = items.map(
    (item, index) =>
      `${index + 1}. ${item.name} - الكمية: ${item.quantity} - السعر: ${formatPrice(
        item.price * item.quantity,
        currency,
      )}`,
  );

  return [
    `مرحباً ${restaurantName}، أريد إتمام الطلب التالي:`,
    ...customerLines,
    ...lines,
    `المجموع الفرعي: ${formatPrice(subtotal, currency)}`,
    `رسوم التوصيل: ${formatPrice(deliveryFee, currency)}`,
    `الإجمالي: ${formatPrice(total, currency)}`,
    "سأرسل موقعي الآن لتأكيد التوصيل.",
  ].join("\n");
};

export const createBookingMessage = (restaurantName: string, booking: BookingFormData) =>
  [
    `مرحباً ${restaurantName}، أريد حجز طاولة بالبيانات التالية:`,
    `الاسم: ${booking.fullName}`,
    `الجوال: ${booking.phone}`,
    `التاريخ: ${booking.date}`,
    `الوقت: ${booking.time}`,
    `عدد الأشخاص: ${booking.guests}`,
    booking.notes?.trim() ? `ملاحظات: ${booking.notes.trim()}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
