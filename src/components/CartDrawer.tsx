import { useEffect } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import type { CartItem, RestaurantConfig } from "../data/restaurantConfig";
import { formatPrice, getCartSubtotal } from "../utils/formatters";

interface CartDrawerProps {
  config: RestaurantConfig;
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  config,
  isOpen,
  items,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  const subtotal = getCartSubtotal(items);
  const total = subtotal + config.restaurant.deliveryFee;

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
                      <button type="button" onClick={() => onDecrement(item.id)} aria-label="تقليل الكمية">
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => onIncrement(item.id)} aria-label="زيادة الكمية">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <button className="cart-item__remove" type="button" onClick={() => onRemove(item.id)} aria-label="حذف العنصر">
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>

            <div className="cart-summary">
              <div>
                <span>{config.ui.cart.subtotal}</span>
                <strong>{formatPrice(subtotal, config.restaurant.currency)}</strong>
              </div>
              <div>
                <span>{config.ui.cart.delivery}</span>
                <strong>{formatPrice(config.restaurant.deliveryFee, config.restaurant.currency)}</strong>
              </div>
              <div className="cart-summary__total">
                <span>{config.ui.cart.total}</span>
                <strong>{formatPrice(total, config.restaurant.currency)}</strong>
              </div>
              <p>{config.ui.cart.customerLocationHint}</p>
              <button className="primary-button primary-button--wide" type="button" onClick={onCheckout}>
                {config.ui.cart.checkoutWhatsapp}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
