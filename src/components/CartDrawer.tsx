import { FormEvent, useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import type { CartItem, RestaurantConfig } from "../data/restaurantConfig";
import { useI18n } from "../lib/i18n/I18nContext";
import type { FulfillmentType } from "../types/platform";
import { getAvailableFulfillmentTypes, getDeliveryFeeForSelection, parseDeliveryAreas } from "../utils/delivery";
import { formatPrice, getCartSubtotal } from "../utils/formatters";

export type CheckoutCustomerDetails = {
  customerAddress?: string;
  customerName: string;
  customerPhone: string;
  deliveryArea?: string;
  deliveryFee: number;
  deliveryNotes?: string;
  fulfillmentType: FulfillmentType;
  notes?: string;
};

interface CartDrawerProps {
  config: RestaurantConfig;
  initialCustomerDetails?: Partial<CheckoutCustomerDetails>;
  isCheckingOut?: boolean;
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onCheckout: (details: CheckoutCustomerDetails) => Promise<void> | void;
}

type CheckoutFormValues = {
  customerAddress: string;
  deliveryArea: string;
  fulfillmentType: FulfillmentType;
  customerName: string;
  customerPhone: string;
  notes: string;
};

type CheckoutFormErrors = Partial<Record<keyof CheckoutFormValues | "form", string>>;

const emptyCheckoutFormValues: CheckoutFormValues = {
  customerAddress: "",
  deliveryArea: "",
  fulfillmentType: "delivery",
  customerName: "",
  customerPhone: "",
  notes: "",
};

export default function CartDrawer({
  config,
  initialCustomerDetails,
  isCheckingOut = false,
  isOpen,
  items,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  const { t } = useI18n();
  const [formValues, setFormValues] = useState<CheckoutFormValues>(emptyCheckoutFormValues);
  const [formErrors, setFormErrors] = useState<CheckoutFormErrors>({});
  const subtotal = getCartSubtotal(items);
  const deliveryAreas = useMemo(() => parseDeliveryAreas(config.settings.deliveryAreas), [config.settings.deliveryAreas]);
  const availableFulfillmentTypes = useMemo(() => getAvailableFulfillmentTypes(config.settings), [config.settings]);
  const deliveryBaseFee = config.settings.deliveryBaseFee ?? config.restaurant.deliveryFee;
  const deliveryFee = getDeliveryFeeForSelection({
    areas: deliveryAreas,
    baseFee: deliveryBaseFee,
    deliveryArea: formValues.deliveryArea,
    freeDeliveryThreshold: config.settings.freeDeliveryThreshold,
    fulfillmentType: formValues.fulfillmentType,
    subtotal,
  });
  const total = subtotal + deliveryFee;
  const isDelivery = formValues.fulfillmentType === "delivery";
  const checkoutLabel =
    config.settings.orderMode === "database"
      ? t("sendOrder")
      : config.settings.orderMode === "both"
        ? t("sendOrderAndWhatsapp")
        : config.ui.cart.checkoutWhatsapp;

  useEffect(() => {
    if (!isOpen || !initialCustomerDetails) {
      return;
    }

    setFormValues((current) => ({
      customerAddress: current.customerAddress || initialCustomerDetails.customerAddress || "",
      deliveryArea: current.deliveryArea,
      fulfillmentType: availableFulfillmentTypes.includes(current.fulfillmentType)
        ? current.fulfillmentType
        : availableFulfillmentTypes[0],
      customerName: current.customerName || initialCustomerDetails.customerName || "",
      customerPhone: current.customerPhone || initialCustomerDetails.customerPhone || "",
      notes: current.notes || initialCustomerDetails.notes || "",
    }));
  }, [availableFulfillmentTypes, initialCustomerDetails, isOpen]);

  useEffect(() => {
    setFormValues((current) => {
      const nextFulfillmentType = availableFulfillmentTypes.includes(current.fulfillmentType)
        ? current.fulfillmentType
        : availableFulfillmentTypes[0];
      const nextDeliveryArea =
        nextFulfillmentType === "delivery" && deliveryAreas.length > 0 && !current.deliveryArea
          ? deliveryAreas[0].name
          : current.deliveryArea;

      if (nextFulfillmentType === current.fulfillmentType && nextDeliveryArea === current.deliveryArea) {
        return current;
      }

      return {
        ...current,
        deliveryArea: nextFulfillmentType === "delivery" ? nextDeliveryArea : "",
        fulfillmentType: nextFulfillmentType,
      };
    });
  }, [availableFulfillmentTypes, deliveryAreas]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.classList.add("body-lock");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("body-lock");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const updateFormValue = <Key extends keyof CheckoutFormValues>(key: Key, value: CheckoutFormValues[Key]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validateCheckoutForm = () => {
    const errors: CheckoutFormErrors = {};

    if (!formValues.customerName.trim()) {
      errors.customerName = t("requiredField");
    }

    if (!formValues.customerPhone.trim()) {
      errors.customerPhone = t("requiredField");
    }

    if (isDelivery && !formValues.customerAddress.trim()) {
      errors.customerAddress = t("requiredField");
    }

    if (isDelivery && deliveryAreas.length > 0 && !formValues.deliveryArea.trim()) {
      errors.deliveryArea = t("requiredField");
    }

    if (
      typeof config.settings.minimumOrderAmount === "number" &&
      Number.isFinite(config.settings.minimumOrderAmount) &&
      config.settings.minimumOrderAmount > 0 &&
      subtotal < config.settings.minimumOrderAmount
    ) {
      errors.form = t("minimumOrderAmountMessage").replace(
        "{amount}",
        formatPrice(config.settings.minimumOrderAmount, config.restaurant.currency),
      );
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateCheckoutForm()) {
      return;
    }

    await onCheckout({
      customerAddress: isDelivery ? formValues.customerAddress.trim() || undefined : undefined,
      customerName: formValues.customerName.trim(),
      customerPhone: formValues.customerPhone.trim(),
      deliveryArea: isDelivery ? formValues.deliveryArea.trim() || undefined : undefined,
      deliveryFee,
      deliveryNotes: isDelivery ? formValues.notes.trim() || undefined : undefined,
      fulfillmentType: formValues.fulfillmentType,
      notes: formValues.notes.trim() || undefined,
    });
  };

  return (
    <div
      className={`cart-shell ${isOpen ? "cart-shell--open" : ""}`}
      aria-hidden={!isOpen}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className="cart-drawer" aria-label={config.ui.cart.title}>
        <div className="cart-drawer__header">
          <h3>{config.ui.cart.title}</h3>
          <button className="icon-button" type="button" onClick={onClose} aria-label={config.ui.close}>
            <X size={21} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBag size={46} />
            <p>{config.ui.cart.empty}</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <img src={item.image} alt={item.name} loading="lazy" />
                  <div className="cart-item__content">
                    <h4>{item.name}</h4>
                    <strong>{formatPrice(item.price, config.restaurant.currency)}</strong>
                    <div className="quantity-control quantity-control--sm">
                      <button type="button" onClick={() => onDecrement(item.id)} aria-label={t("decreaseQuantity")}>
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => onIncrement(item.id)} aria-label={t("increaseQuantity")}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <button className="cart-item__remove" type="button" onClick={() => onRemove(item.id)} aria-label={t("removeItem")}>
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-fulfillment-toggle" role="group" aria-label={t("fulfillmentType")}>
                {availableFulfillmentTypes.includes("delivery") ? (
                  <button
                    className={formValues.fulfillmentType === "delivery" ? "is-active" : ""}
                    type="button"
                    onClick={() => updateFormValue("fulfillmentType", "delivery")}
                  >
                    {t("deliveryToAddress")}
                  </button>
                ) : null}
                {availableFulfillmentTypes.includes("pickup") ? (
                  <button
                    className={formValues.fulfillmentType === "pickup" ? "is-active" : ""}
                    type="button"
                    onClick={() => updateFormValue("fulfillmentType", "pickup")}
                  >
                    {t("pickupFromRestaurant")}
                  </button>
                ) : null}
              </div>
              <div className="cart-summary__row">
                <span>{config.ui.cart.subtotal}</span>
                <strong>{formatPrice(subtotal, config.restaurant.currency)}</strong>
              </div>
              <div className="cart-summary__row">
                <span>{config.ui.cart.delivery}</span>
                <strong>{formatPrice(deliveryFee, config.restaurant.currency)}</strong>
              </div>
              <div className="cart-summary__row cart-summary__total">
                <span>{config.ui.cart.total}</span>
                <strong>{formatPrice(total, config.restaurant.currency)}</strong>
              </div>
              {isDelivery ? (
                <p>
                  {config.settings.estimatedDeliveryMinutes
                    ? `${t("estimatedDeliveryTime")}: ${config.settings.estimatedDeliveryMinutes}`
                    : config.ui.cart.customerLocationHint}
                </p>
              ) : (
                <p>
                  {t("pickupAddress")}: {config.restaurant.address || t("notAvailable")}
                </p>
              )}
              {isDelivery && config.settings.deliveryInstructions ? <p>{config.settings.deliveryInstructions}</p> : null}
              {isDelivery && typeof config.settings.freeDeliveryThreshold === "number" && config.settings.freeDeliveryThreshold > 0 ? (
                <p>{t("freeDeliveryFrom").replace("{amount}", formatPrice(config.settings.freeDeliveryThreshold, config.restaurant.currency))}</p>
              ) : null}
              <form className="cart-checkout-form" onSubmit={handleSubmit} noValidate>
                {formErrors.form ? <div className="cart-form-error">{formErrors.form}</div> : null}
                <label>
                  <span>{t("customerName")}</span>
                  <input
                    value={formValues.customerName}
                    onChange={(event) => updateFormValue("customerName", event.target.value)}
                    aria-invalid={Boolean(formErrors.customerName)}
                    autoComplete="name"
                  />
                  {formErrors.customerName ? <small>{formErrors.customerName}</small> : null}
                </label>
                <label>
                  <span>{t("customerPhone")}</span>
                  <input
                    value={formValues.customerPhone}
                    onChange={(event) => updateFormValue("customerPhone", event.target.value)}
                    aria-invalid={Boolean(formErrors.customerPhone)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                  {formErrors.customerPhone ? <small>{formErrors.customerPhone}</small> : null}
                </label>
                <label>
                  <span>{isDelivery ? t("customerAddress") : t("pickupAddress")}</span>
                  {isDelivery ? (
                    <>
                      <input
                        value={formValues.customerAddress}
                        onChange={(event) => updateFormValue("customerAddress", event.target.value)}
                        aria-invalid={Boolean(formErrors.customerAddress)}
                        autoComplete="street-address"
                      />
                      {formErrors.customerAddress ? <small>{formErrors.customerAddress}</small> : null}
                    </>
                  ) : (
                    <input value={config.restaurant.address || t("notAvailable")} disabled />
                  )}
                </label>
                {isDelivery && deliveryAreas.length > 0 ? (
                  <label>
                    <span>{t("deliveryArea")}</span>
                    <select
                      value={formValues.deliveryArea}
                      onChange={(event) => updateFormValue("deliveryArea", event.target.value)}
                      aria-invalid={Boolean(formErrors.deliveryArea)}
                    >
                      {deliveryAreas.map((area) => (
                        <option value={area.name} key={area.name}>
                          {area.fee === undefined
                            ? area.name
                            : `${area.name} - ${formatPrice(area.fee, config.restaurant.currency)}`}
                        </option>
                      ))}
                    </select>
                    {formErrors.deliveryArea ? <small>{formErrors.deliveryArea}</small> : null}
                  </label>
                ) : null}
                <label>
                  <span>{t("notes")}</span>
                  <textarea value={formValues.notes} onChange={(event) => updateFormValue("notes", event.target.value)} rows={2} />
                </label>
                <button className="primary-button primary-button--wide" type="submit" disabled={isCheckingOut}>
                  {isCheckingOut ? t("orderSubmitting") : checkoutLabel}
                </button>
              </form>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
