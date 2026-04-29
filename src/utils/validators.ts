import type { BookingFormData } from "../data/restaurantConfig";

export type BookingErrors = Partial<Record<keyof BookingFormData, string>>;

type BookingValidationMessages = {
  invalidValue: string;
  requiredField: string;
};

const defaultMessages: BookingValidationMessages = {
  invalidValue: "Invalid value.",
  requiredField: "This field is required.",
};

export const validateBookingForm = (values: BookingFormData, messages: BookingValidationMessages = defaultMessages): BookingErrors => {
  const errors: BookingErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = messages.requiredField;
  }

  if (!values.phone.trim()) {
    errors.phone = messages.requiredField;
  } else if (!/^[\d\s()+-]{8,18}$/.test(values.phone.trim())) {
    errors.phone = messages.invalidValue;
  }

  if (!values.date) {
    errors.date = messages.requiredField;
  }

  if (!values.time) {
    errors.time = messages.requiredField;
  }

  if (!values.guests) {
    errors.guests = messages.requiredField;
  } else if (Number(values.guests) < 1) {
    errors.guests = messages.invalidValue;
  }

  return errors;
};

export const hasValidationErrors = (errors: BookingErrors) => Object.keys(errors).length > 0;
