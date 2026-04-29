import { FormEvent, useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { mapKnownErrorToFriendlyMessage } from "../lib/friendlyErrors";
import { useI18n } from "../lib/i18n/I18nContext";
import {
  hasTrackRequestFunctionConfig,
  trackRequest,
  type TrackRequestResult,
} from "../services/repositories/trackingRepository";
import { createWhatsappUrl, formatPrice } from "../utils/formatters";

type TrackingPageProps = {
  restaurantSlug: string;
};

const orderStatusKeys: Record<string, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  new: "orderStatusNew",
  confirmed: "orderStatusConfirmed",
  preparing: "orderStatusPreparing",
  ready: "orderStatusReady",
  out_for_delivery: "orderStatusOutForDelivery",
  completed: "orderStatusCompleted",
  cancelled: "orderStatusCancelled",
  rejected: "orderStatusRejected",
};

const reservationStatusKeys: Record<string, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  new: "reservationStatusNew",
  pending_confirmation: "reservationStatusPendingConfirmation",
  confirmed: "reservationStatusConfirmed",
  deposit_required: "reservationStatusDepositRequired",
  deposit_paid: "reservationStatusDepositPaid",
  seated: "reservationStatusSeated",
  completed: "reservationStatusCompleted",
  no_show: "reservationStatusNoShow",
  cancelled: "reservationStatusCancelled",
  rejected: "reservationStatusRejected",
};

const depositStatusKeys: Record<string, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  none: "depositStatusNone",
  paid: "depositStatusPaid",
  required: "depositStatusRequired",
};

const formatDate = (value: string | null | undefined, language: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function TrackingPage({ restaurantSlug }: TrackingPageProps) {
  const { currentLanguage, t } = useI18n();
  const [phone, setPhone] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [type, setType] = useState<"" | "order" | "reservation">("");
  const [result, setResult] = useState<TrackRequestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusLabel = useMemo(() => {
    const tracked = result?.result;

    if (!tracked) {
      return "";
    }

    const key = tracked.type === "order" ? orderStatusKeys[tracked.status] : reservationStatusKeys[tracked.status];
    return key ? t(key) : tracked.status;
  }, [result, t]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setResult(null);

    if (!phone.trim() || !trackingCode.trim()) {
      setErrorMessage(t("resultNotFound"));
      return;
    }

    setIsSubmitting(true);

    try {
      const nextResult = await trackRequest({
        restaurantSlug,
        phone,
        trackingCode,
        type: type || undefined,
      });

      setResult(nextResult);

      if (!nextResult.found) {
        setErrorMessage(t("resultNotFound"));
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(error);
      }
      setErrorMessage(mapKnownErrorToFriendlyMessage(error, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsapp = () => {
    const tracked = result?.result;
    const restaurant = result?.restaurant;

    if (!tracked || !restaurant?.whatsappNumber) {
      return;
    }

    const message = `${t("trackingCode")}: ${tracked.trackingCode}\n${t("currentStatus")}: ${statusLabel}`;
    window.open(createWhatsappUrl(restaurant.whatsappNumber, message), "_blank", "noopener,noreferrer");
  };

  const tracked = result?.result;

  return (
    <main className="tracking-page">
      <section className="tracking-panel">
        <div className="tracking-panel__header">
          <span>{restaurantSlug}</span>
          <h1>{t("trackRequest")}</h1>
        </div>

        {!hasTrackRequestFunctionConfig ? (
          <div className="tracking-alert">
            {import.meta.env.DEV ? t("trackingUnavailableDevelopment") : t("trackingUnavailablePublic")}
          </div>
        ) : null}

        <form className="tracking-form" onSubmit={submit}>
          <label>
            <span>{t("trackingPhone")}</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
          </label>
          <label>
            <span>{t("trackingCode")}</span>
            <input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} dir="ltr" />
          </label>
          <label>
            <span>{t("type")}</span>
            <select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              <option value="">{t("all")}</option>
              <option value="order">{t("order")}</option>
              <option value="reservation">{t("reservation")}</option>
            </select>
          </label>
          <button className="primary-button primary-button--wide" type="submit" disabled={isSubmitting || !hasTrackRequestFunctionConfig}>
            <Search size={18} />
            {isSubmitting ? t("loading") : t("trackButton")}
          </button>
        </form>

        {errorMessage ? <div className="tracking-alert">{errorMessage}</div> : null}

        {tracked ? (
          <article className="tracking-result">
            <div>
              <span>{tracked.type === "order" ? t("order") : t("reservation")}</span>
              <strong>{tracked.trackingCode}</strong>
            </div>
            <div>
              <span>{t("currentStatus")}</span>
              <strong>{statusLabel}</strong>
            </div>
            {tracked.createdAt ? (
              <div>
                <span>{t("createdAt")}</span>
                <strong>{formatDate(tracked.createdAt, currentLanguage)}</strong>
              </div>
            ) : null}
            {tracked.type === "order" ? (
              <>
                <div>
                  <span>{t("summary")}</span>
                  <strong>
                    {tracked.itemCount ?? 0} {t("items")}
                  </strong>
                </div>
                {typeof tracked.totalAmount === "number" ? (
                  <div>
                    <span>{t("total")}</span>
                    <strong>{formatPrice(tracked.totalAmount, "MAD")}</strong>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div>
                  <span>{t("reservations")}</span>
                  <strong>
                    {tracked.reservationDate} {tracked.reservationTime}
                  </strong>
                </div>
                <div>
                  <span>{t("peopleCount")}</span>
                  <strong>{tracked.peopleCount}</strong>
                </div>
                {tracked.depositStatus && tracked.depositStatus !== "none" ? (
                  <div>
                    <span>{t("deposit")}</span>
                    <strong>
                      {depositStatusKeys[tracked.depositStatus] ? t(depositStatusKeys[tracked.depositStatus]) : tracked.depositStatus}
                      {tracked.depositAmount ? ` - ${formatPrice(tracked.depositAmount, "MAD")}` : ""}
                    </strong>
                  </div>
                ) : null}
              </>
            )}
            {result?.restaurant?.whatsappNumber ? (
              <button className="secondary-whatsapp-button" type="button" onClick={openWhatsapp}>
                <MessageCircle size={18} />
                {t("messageRestaurant")}
              </button>
            ) : null}
          </article>
        ) : null}
      </section>
    </main>
  );
}
