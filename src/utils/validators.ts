import type { BookingFormData } from "../data/restaurantConfig";

export type BookingErrors = Partial<Record<keyof BookingFormData, string>>;

export const validateBookingForm = (values: BookingFormData): BookingErrors => {
  const errors: BookingErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "يرجى إدخال الاسم الكامل.";
  }

  if (!values.phone.trim()) {
    errors.phone = "يرجى إدخال رقم الجوال.";
  } else if (!/^[\d\s()+-]{8,18}$/.test(values.phone.trim())) {
    errors.phone = "رقم الجوال غير صحيح.";
  }

  if (!values.date) {
    errors.date = "يرجى اختيار التاريخ.";
  }

  if (!values.time) {
    errors.time = "يرجى اختيار الوقت.";
  }

  if (!values.guests) {
    errors.guests = "يرجى إدخال عدد الأشخاص.";
  } else if (Number(values.guests) < 1) {
    errors.guests = "عدد الأشخاص يجب أن يكون 1 أو أكثر.";
  }

  return errors;
};

export const hasValidationErrors = (errors: BookingErrors) => Object.keys(errors).length > 0;
