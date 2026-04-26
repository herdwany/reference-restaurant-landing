import { useMemo, useState, type SyntheticEvent } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import type { Dish, RestaurantConfig } from "../data/restaurantConfig";
import { formatPrice } from "../utils/formatters";
import Modal from "./Modal";
import SectionTitle from "./SectionTitle";

interface FeaturedDishesProps {
  config: RestaurantConfig;
  onAddToCart: (dish: Dish, quantity?: number) => void;
}

const getLoopedItems = <T,>(items: T[], start: number, count: number) => {
  if (items.length <= count) {
    return items;
  }

  return Array.from({ length: count }, (_, index) => items[(start + index) % items.length]);
};

export default function FeaturedDishes({ config, onAddToCart }: FeaturedDishesProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [quantity, setQuantity] = useState(1);

  const visibleDishes = useMemo(() => getLoopedItems(config.dishes, startIndex, 4), [config.dishes, startIndex]);
  const fallbackImage = config.dishes[0]?.image || config.brand.heroImage;

  const move = (direction: "next" | "prev") => {
    if (config.dishes.length === 0) {
      return;
    }

    setStartIndex((current) => {
      const step = direction === "next" ? 1 : -1;
      return (current + step + config.dishes.length) % config.dishes.length;
    });
  };

  const openDish = (dish: Dish) => {
    setSelectedDish(dish);
    setQuantity(1);
  };

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.dataset.fallbackApplied === "true") {
      return;
    }

    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = fallbackImage;
  };

  return (
    <section className="section dishes-section" id="menu">
      <div className="container">
        <SectionTitle title={config.ui.sectionTitles.featuredDishes} />

        <div className="section-toolbar">
          <button className="icon-button carousel-button" type="button" onClick={() => move("next")} aria-label="التالي">
            <ChevronRight size={22} />
          </button>
          <button className="icon-button carousel-button" type="button" onClick={() => move("prev")} aria-label="السابق">
            <ChevronLeft size={22} />
          </button>
        </div>

        <div className="dishes-grid">
          {visibleDishes.map((dish) => (
            <article className="dish-card" key={dish.id}>
              <button className="dish-card__image" type="button" onClick={() => openDish(dish)}>
                <img src={dish.image} alt={dish.name} loading="lazy" onError={handleImageError} />
                {dish.badge ? <span>{dish.badge}</span> : null}
              </button>
              <div className="dish-card__body">
                <button className="dish-card__title" type="button" onClick={() => openDish(dish)}>
                  {dish.name}
                </button>
                <p>{dish.description}</p>
                <div className="dish-card__meta">
                  <span className="dish-card__rating">
                    <Star size={16} fill="currentColor" />
                    {dish.rating}
                  </span>
                  <span className="dish-card__price">
                    <strong>{formatPrice(dish.price, config.restaurant.currency)}</strong>
                    {dish.oldPrice ? <del>{formatPrice(dish.oldPrice, config.restaurant.currency)}</del> : null}
                  </span>
                </div>
                <button className="outline-order-button" type="button" onClick={() => onAddToCart(dish)}>
                  <ShoppingCart size={18} />
                  {config.ui.orderNow}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedDish)}
        onClose={() => setSelectedDish(null)}
        title={config.ui.details}
        size="lg"
        closeLabel={config.ui.close}
      >
        {selectedDish ? (
          <div className="dish-modal">
            <img src={selectedDish.image} alt={selectedDish.name} onError={handleImageError} />
            <div className="dish-modal__content">
              <span className="dish-modal__category">{selectedDish.category}</span>
              <h3>{selectedDish.name}</h3>
              <p>{selectedDish.description}</p>
              <strong>{formatPrice(selectedDish.price, config.restaurant.currency)}</strong>
              <div className="ingredients">
                {selectedDish.ingredients.map((ingredient) => (
                  <span key={ingredient}>{ingredient}</span>
                ))}
              </div>
              <div className="quantity-control" aria-label={config.ui.quantity}>
                <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>
                  <Minus size={18} />
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((current) => current + 1)}>
                  <Plus size={18} />
                </button>
              </div>
              <button
                className="primary-button primary-button--wide"
                type="button"
                onClick={() => {
                  onAddToCart(selectedDish, quantity);
                  setSelectedDish(null);
                }}
              >
                <ShoppingCart size={20} />
                {config.ui.addToCart}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
