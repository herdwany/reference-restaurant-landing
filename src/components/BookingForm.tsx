import { FormEvent, useEffect, useState } from "react";
import { CalendarCheck, MessageCircle } from "lucide-react";
import type { BookingFormData, RestaurantConfig } from "../data/restaurantConfig";
import {
  ReservationsRepositoryError,
  createReservation as createAppwriteReservation,
  createReservationViaFunction,
  hasCreateReservationFunctionConfig,
  type CreateReservationInput,
} from "../services/repositories/reservationsRepository";
import { canUseDirectSensitiveTableFallback, isDevelopmentBuild, isProductionBuild } from "../lib/appwriteIds";
import { mapKnownErrorToFriendlyMessage } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import { createBookingMessage, createWhatsappUrl } from "../utils/formatters";
import { hasValidationErrors, validateBookingForm } from "../utils/validators";
import type { BookingErrors } from "../utils/validators";
import Modal from "./Modal";

interface BookingFormProps {
  config: RestaurantConfig;
  initialCustomerDetails?: Partial<CustomerRequestDetails>;
  onCustomerDetailsCaptured?: (details: CustomerRequestDetails) => Promise<CustomerRequestIdentity> | CustomerRequestIdentity;
  restaurantSlug: string;
  onToast: (message: string, type?: "success" | "error" | "info") => void;
}

type CustomerRequestDetails = {
  customerAddress?: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
};

type CustomerRequestIdentity = {
  customerProfileId?: string;
  customerUserId?: string;
} | null;

const initialBooking: BookingFormData = {
  fullName: "",
  phone: "",
  date: "",
  time: "",
  guests: "",
  notes: "",
  policyAccepted: false,
};

const saveBooking = (booking: BookingFormData) => {
  const stored = window.localStorage.getItem("restaurant-bookings");
  const bookings = stored ? (JSON.parse(stored) as BookingFormData[]) : [];
  window.localStorage.setItem("restaurant-bookings", JSON.stringify([...bookings, booking]));
};

export default function BookingForm({
  config,
  initialCustomerDetails,
  onCustomerDetailsCaptured,
  restaurantSlug,
  onToast,
}: BookingFormProps) {
  const { t } = useI18n();
  const [values, setValues] = useState(initialBooking);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [lastBooking, setLastBooking] = useState<BookingFormData | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <Field extends keyof BookingFormData>(field: Field, value: BookingFormData[Field]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  useEffect(() => {
    if (!initialCustomerDetails) {
      return;
    }

    setValues((current) => {
      const nextValues = {
        ...current,
        fullName: current.fullName || initialCustomerDetails.customerName || "",
        phone: current.phone || initialCustomerDetails.customerPhone || "",
        notes: current.notes || initialCustomerDetails.notes || "",
      };

      return nextValues.fullName === current.fullName && nextValues.phone === current.phone && nextValues.notes === current.notes
        ? current
        : nextValues;
    });
  }, [initialCustomerDetails]);

  const validate = () => {
    const validationErrors = validateBookingForm(values, {
      invalidValue: t("invalidValue"),
      requiredField: t("requiredField"),
    });
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      onToast(config.ui.toasts.completeFields, "error");
      return false;
    }

    return true;
  };

  const persistSuccessfulBooking = (booking: BookingFormData, options?: { resetValues?: boolean; showToast?: boolean }) => {
    saveBooking(booking);
    setLastBooking(booking);
    setSuccessOpen(true);
    if (options?.showToast !== false) {
      onToast(config.ui.toasts.bookingSuccess, "success");
    }

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

  const getReservationErrorMessage = (error: unknown) => mapKnownErrorToFriendlyMessage(error, t);

  const captureCustomerDetails = async (booking: BookingFormData) => {
    if (!onCustomerDetailsCaptured) {
      return null;
    }

    try {
      return await onCustomerDetailsCaptured({
        customerName: booking.fullName,
        customerPhone: booking.phone,
        notes: booking.notes,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(error);
      }

      return null;
    }
  };

  const toReservationInput = (booking: BookingFormData, customerIdentity?: CustomerRequestIdentity): CreateReservationInput => ({
    restaurantId: config.restaurant.id ?? "",
    restaurantSlug,
    ...(customerIdentity?.customerUserId ? { customerUserId: customerIdentity.customerUserId } : {}),
    ...(customerIdentity?.customerProfileId ? { customerProfileId: customerIdentity.customerProfileId } : {}),
    customerName: booking.fullName,
    customerPhone: booking.phone,
    reservationDate: booking.date,
    reservationTime: booking.time,
    peopleCount: Number(booking.guests),
    notes: booking.notes,
    policyAccepted: Boolean(booking.policyAccepted),
    status: needsDeposit ? "deposit_required" : config.settings.requireManualReservationConfirmation ? "pending_confirmation" : "new",
    depositStatus: needsDeposit ? "required" : "none",
    depositAmount: needsDeposit ? config.settings.depositAmount : undefined,
  });

  const submitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const booking = { ...values };
    const reservationMode = config.settings.reservationMode ?? "both";

    if (reservationMode === "whatsapp") {
      void captureCustomerDetails(booking);
      persistSuccessfulBooking(booking);
      openWhatsappBooking(booking);
      return;
    }

    if (!hasCreateReservationFunctionConfig && isProductionBuild) {
      onToast(
        reservationMode === "both"
          ? t("appwriteSetupRequired")
          : t("appwriteSetupRequired"),
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
          ? t("operationFailed")
          : t("operationFailed"),
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
      const customerIdentity = await captureCustomerDetails(booking);
      const reservationInput = toReservationInput(booking, customerIdentity);

      let createdTrackingCode = "";

      if (hasCreateReservationFunctionConfig) {
        const createdReservation = await createReservationViaFunction(reservationInput);
        createdTrackingCode = createdReservation.trackingCode;
      } else {
        if (!canUseDirectSensitiveTableFallback) {
          throw new ReservationsRepositoryError(t("appwriteSetupRequired"), "APPWRITE_NOT_CONFIGURED");
        }

        if (isDevelopmentBuild) {
          console.warn("Using direct browser createReservation fallback. This path is for development/staging only.");
        }

        const createdReservation = await createAppwriteReservation(reservationInput);
        createdTrackingCode = createdReservation.trackingCode ?? "";
      }

      persistSuccessfulBooking(booking, {
        resetValues: reservationMode === "database" || reservationMode === "both",
        showToast: !createdTrackingCode,
      });
      if (createdTrackingCode) {
        onToast(`${config.ui.toasts.bookingSuccess} ${t("trackingCode")}: ${createdTrackingCode}`, "success");
      }

      if (reservationMode === "both") {
        openWhatsappBooking(booking);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(error);
      }
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
    void captureCustomerDetails(booking);
    saveBooking(booking);
    setLastBooking(booking);
    onToast(config.ui.toasts.bookingSuccess, "success");
    openWhatsappBooking(booking);
  };

  const minDate = new Date().toISOString().split("T")[0];
  const guestsCount = Number(values.guests);
  const needsDeposit =
    Boolean(config.settings.requireDepositForLargeGroups) &&
    Number.isFinite(guestsCount) &&
    guestsCount >= (config.settings.depositThresholdPeople ?? Number.POSITIVE_INFINITY);
  const showPolicies = Boolean(config.settings.depositPolicyText || config.settings.cancellationPolicyText);

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
        {needsDeposit ? <div className="booking-policy booking-policy--notice">{t("depositMayBeRequired")}</div> : null}
        {showPolicies ? (
          <div className="booking-policy">
            {config.settings.depositPolicyText ? <p>{config.settings.depositPolicyText}</p> : null}
            {config.settings.cancellationPolicyText ? <p>{config.settings.cancellationPolicyText}</p> : null}
            <label className="booking-policy__check">
              <input
                type="checkbox"
                checked={Boolean(values.policyAccepted)}
                onChange={(event) => updateField("policyAccepted", event.target.checked)}
              />
              <span>{t("policyAccepted")}</span>
            </label>
          </div>
        ) : null}
        <button className="primary-button primary-button--wide" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("reservationSubmitting") : config.ui.booking.submit}
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
