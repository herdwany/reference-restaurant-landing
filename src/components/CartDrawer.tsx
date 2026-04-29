import { FormEvent, useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import type { CartItem, RestaurantConfig } from "../data/restaurantConfig";
import { useI18n } from "../lib/i18n/I18nContext";
import { formatPrice, getCartSubtotal } from "../utils/formatters";

export type CheckoutCustomerDetails = {
  customerAddress?: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
};

interface CartDrawerProps {
  config: RestaurantConfig;
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
  customerName: string;
  customerPhone: string;
  notes: string;
};

type CheckoutFormErrors = Partial<Record<keyof CheckoutFormValues, string>>;

const emptyCheckoutFormValues: CheckoutFormValues = {
  customerAddress: "",
  customerName: "",
  customerPhone: "",
  notes: "",
};

export default function CartDrawer({
  config,
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
  const total = subtotal + config.restaurant.deliveryFee;
  const checkoutLabel =
    config.settings.orderMode === "database"
      ? t("sendOrder")
      : config.settings.orderMode === "both"
        ? t("sendOrderAndWhatsapp")
        : config.ui.cart.checkoutWhatsapp;

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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateCheckoutForm()) {
      return;
    }

    await onCheckout({
      customerAddress: formValues.customerAddress.trim() || undefined,
      customerName: formValues.customerName.trim(),
      customerPhone: formValues.customerPhone.trim(),
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
              <div className="cart-summary__row">
                <span>{config.ui.cart.subtotal}</span>
                <strong>{formatPrice(subtotal, config.restaurant.currency)}</strong>
              </div>
              <div className="cart-summary__row">
                <span>{config.ui.cart.delivery}</span>
                <strong>{formatPrice(config.restaurant.deliveryFee, config.restaurant.currency)}</strong>
              </div>
              <div className="cart-summary__row cart-summary__total">
                <span>{config.ui.cart.total}</span>
                <strong>{formatPrice(total, config.restaurant.currency)}</strong>
              </div>
              <p>{config.ui.cart.customerLocationHint}</p>
              <form className="cart-checkout-form" onSubmit={handleSubmit} noValidate>
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
                  <span>{t("customerAddress")}</span>
                  <input
                    value={formValues.customerAddress}
                    onChange={(event) => updateFormValue("customerAddress", event.target.value)}
                    autoComplete="street-address"
                  />
                </label>
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
