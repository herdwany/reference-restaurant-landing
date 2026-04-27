import { FormEvent, useState } from "react";
import { CalendarCheck, MessageCircle } from "lucide-react";
import type { BookingFormData, RestaurantConfig } from "../data/restaurantConfig";
import {
  ReservationsRepositoryError,
  createReservation as createAppwriteReservation,
  createReservationViaFunction,
  hasCreateReservationFunctionConfig,
  type CreateReservationInput,
} from "../services/repositories/reservationsRepository";
import { DEFAULT_RESTAURANT_SLUG, canUseDirectSensitiveTableFallback, isDevelopmentBuild, isProductionBuild } from "../lib/appwriteIds";
import { createBookingMessage, createWhatsappUrl } from "../utils/formatters";
import { hasValidationErrors, validateBookingForm } from "../utils/validators";
import type { BookingErrors } from "../utils/validators";
import Modal from "./Modal";

interface BookingFormProps {
  config: RestaurantConfig;
  onToast: (message: string, type?: "success" | "error" | "info") => void;
}

const initialBooking: BookingFormData = {
  fullName: "",
  phone: "",
  date: "",
  time: "",
  guests: "",
  notes: "",
};

const saveBooking = (booking: BookingFormData) => {
  const stored = window.localStorage.getItem("restaurant-bookings");
  const bookings = stored ? (JSON.parse(stored) as BookingFormData[]) : [];
  window.localStorage.setItem("restaurant-bookings", JSON.stringify([...bookings, booking]));
};

export default function BookingForm({ config, onToast }: BookingFormProps) {
  const [values, setValues] = useState(initialBooking);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [lastBooking, setLastBooking] = useState<BookingFormData | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof BookingFormData, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const validationErrors = validateBookingForm(values);
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      onToast(config.ui.toasts.completeFields, "error");
      return false;
    }

    return true;
  };

  const persistSuccessfulBooking = (booking: BookingFormData, options?: { resetValues?: boolean }) => {
    saveBooking(booking);
    setLastBooking(booking);
    setSuccessOpen(true);
    onToast(config.ui.toasts.bookingSuccess, "success");

    if (options?.resetValues) {
      setValues(initialBooking);
    }
  };

  const openWhatsappBooking = (booking: BookingFormData) => {
    window.open(
      createWhatsappUrl(config.restaurant.whatsappNumber, createBookingMessage(config.restaurant.name, booking)),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const getReservationErrorMessage = (error: unknown) => {
    if (error instanceof ReservationsRepositoryError) {
      return error.message;
    }

    return "تعذر حفظ الحجز في قاعدة البيانات. سيتم فتح واتساب كبديل إذا كان متاحًا.";
  };

  const toReservationInput = (booking: BookingFormData): CreateReservationInput => ({
    restaurantId: config.restaurant.id ?? "",
    restaurantSlug: DEFAULT_RESTAURANT_SLUG,
    customerName: booking.fullName,
    customerPhone: booking.phone,
    reservationDate: booking.date,
    reservationTime: booking.time,
    peopleCount: Number(booking.guests),
    notes: booking.notes,
  });

  const submitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const booking = { ...values };
    const reservationMode = config.settings.reservationMode ?? "both";

    if (reservationMode === "whatsapp") {
      persistSuccessfulBooking(booking);
      openWhatsappBooking(booking);
      return;
    }

    if (!hasCreateReservationFunctionConfig && isProductionBuild) {
      onToast(
        reservationMode === "both"
          ? "لم يتم تفعيل دالة إنشاء الحجوزات في الإنتاج. سيتم فتح واتساب كبديل."
          : "لم يتم تفعيل دالة إنشاء الحجوزات في الإنتاج. لا يمكن حفظ الحجز الآن.",
        "error",
      );
      saveBooking(booking);

      if (reservationMode === "both") {
        openWhatsappBooking(booking);
      }

      return;
    }

    if (!hasCreateReservationFunctionConfig && !config.restaurant.id) {
      onToast(
        reservationMode === "both"
          ? "تعذر حفظ الحجز في Appwrite. سيتم فتح واتساب كبديل حتى لا تضيع البيانات."
          : "تعذر حفظ الحجز في Appwrite.",
        "error",
      );
      saveBooking(booking);

      if (reservationMode === "both") {
        openWhatsappBooking(booking);
      }

      return;
    }

    setIsSubmitting(true);

    try {
      const reservationInput = toReservationInput(booking);

      if (hasCreateReservationFunctionConfig) {
        await createReservationViaFunction(reservationInput);
      } else {
        if (!canUseDirectSensitiveTableFallback) {
          throw new ReservationsRepositoryError("لا يمكن إنشاء الحجز مباشرة من المتصفح في بيئة الإنتاج.", "APPWRITE_NOT_CONFIGURED");
        }

        if (isDevelopmentBuild) {
          console.warn("Using direct browser createReservation fallback. This path is for development/staging only.");
        }

        await createAppwriteReservation(reservationInput);
      }

      persistSuccessfulBooking(booking, { resetValues: reservationMode === "database" || reservationMode === "both" });

      if (reservationMode === "both") {
        openWhatsappBooking(booking);
      }
    } catch (error) {
      saveBooking(booking);
      onToast(getReservationErrorMessage(error), "error");

      if (reservationMode === "both") {
        openWhatsappBooking(booking);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendToWhatsapp = () => {
    if (!validate()) {
      return;
    }

    const booking = { ...values };
    saveBooking(booking);
    setLastBooking(booking);
    onToast(config.ui.toasts.bookingSuccess, "success");
    openWhatsappBooking(booking);
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <article className="info-card booking-card">
      <h3>
        <CalendarCheck size={23} />
        {config.ui.booking.title}
      </h3>
      <form
        onSubmit={(event) => {
          void submitBooking(event);
        }}
        noValidate
      >
        <label>
          <span>{config.ui.booking.fullName}</span>
          <input
            value={values.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder={config.ui.booking.fullName}
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName ? <small>{errors.fullName}</small> : null}
        </label>
        <label>
          <span>{config.ui.booking.phone}</span>
          <input
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="05xxxxxxxx"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone ? <small>{errors.phone}</small> : null}
        </label>
        <div className="form-row">
          <label>
            <span>{config.ui.booking.date}</span>
            <input
              value={values.date}
              onChange={(event) => updateField("date", event.target.value)}
              type="date"
              min={minDate}
              aria-invalid={Boolean(errors.date)}
            />
            {errors.date ? <small>{errors.date}</small> : null}
          </label>
          <label>
            <span>{config.ui.booking.time}</span>
            <input
              value={values.time}
              onChange={(event) => updateField("time", event.target.value)}
              type="time"
              aria-invalid={Boolean(errors.time)}
            />
            {errors.time ? <small>{errors.time}</small> : null}
          </label>
        </div>
        <label>
          <span>{config.ui.booking.guests}</span>
          <input
            value={values.guests}
            onChange={(event) => updateField("guests", event.target.value)}
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="2"
            aria-invalid={Boolean(errors.guests)}
          />
          {errors.guests ? <small>{errors.guests}</small> : null}
        </label>
        <label>
          <span>{config.ui.booking.notes}</span>
          <textarea
            value={values.notes ?? ""}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder={config.ui.booking.notes}
            rows={4}
          />
        </label>
        <button className="primary-button primary-button--wide" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ إرسال الحجز..." : config.ui.booking.submit}
        </button>
        <button className="secondary-whatsapp-button" type="button" onClick={sendToWhatsapp} disabled={isSubmitting}>
          <MessageCircle size={19} />
          {config.ui.booking.whatsappSubmit}
        </button>
      </form>

      <Modal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={config.ui.booking.successTitle}
        closeLabel={config.ui.close}
      >
        <div className="success-modal">
          <p>{config.ui.booking.successText}</p>
          {lastBooking ? (
            <dl>
              <div>
                <dt>{config.ui.booking.fullName}</dt>
                <dd>{lastBooking.fullName}</dd>
              </div>
              <div>
                <dt>{config.ui.booking.date}</dt>
                <dd>{lastBooking.date}</dd>
              </div>
              <div>
                <dt>{config.ui.booking.time}</dt>
                <dd>{lastBooking.time}</dd>
              </div>
              <div>
                <dt>{config.ui.booking.guests}</dt>
                <dd>{lastBooking.guests}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </Modal>
    </article>
  );
}
