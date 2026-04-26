import { useState } from "react";
import { BookOpen, ShoppingCart } from "lucide-react";
import type { MenuCategory, MenuItem, RestaurantConfig } from "../data/restaurantConfig";
import { formatPrice } from "../utils/formatters";
import Modal from "./Modal";

interface MenuPreviewProps {
  config: RestaurantConfig;
  onAddToCart: (item: MenuItem) => void;
}

export default function MenuPreview({ config, onAddToCart }: MenuPreviewProps) {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [fullMenuOpen, setFullMenuOpen] = useState(false);

  const renderItem = (item: MenuItem) => (
    <article className="menu-item-row" key={item.id}>
      <img src={item.image} alt={item.name} loading="lazy" />
      <div>
        <h4>{item.name}</h4>
        <p>{item.description}</p>
        <strong>{formatPrice(item.price, config.restaurant.currency)}</strong>
      </div>
      <button type="button" onClick={() => onAddToCart(item)} aria-label={`${config.ui.addToCart} ${item.name}`}>
        <ShoppingCart size={17} />
      </button>
    </article>
  );

  return (
    <article className="info-card menu-card">
      <h3>
        <BookOpen size={23} />
        {config.ui.menu.title}
      </h3>
      <div className="menu-categories">
        {config.menuCategories.map((category) => (
          <article className="menu-category" key={category.id}>
            <img src={category.image} alt={category.name} loading="lazy" />
            <div>
              <h4>{category.name}</h4>
              <p>{category.description}</p>
            </div>
            <button type="button" onClick={() => setSelectedCategory(category)}>
              {config.ui.menu.view}
            </button>
          </article>
        ))}
      </div>
      <button className="outline-order-button outline-order-button--wide" type="button" onClick={() => setFullMenuOpen(true)}>
        {config.ui.menu.viewFull}
      </button>

      <Modal
        isOpen={Boolean(selectedCategory)}
        onClose={() => setSelectedCategory(null)}
        title={selectedCategory?.name}
        size="lg"
        closeLabel={config.ui.close}
      >
        <div className="menu-modal-list">{selectedCategory?.items.map(renderItem)}</div>
      </Modal>

      <Modal
        isOpen={fullMenuOpen}
        onClose={() => setFullMenuOpen(false)}
        title={config.ui.menu.fullTitle}
        size="lg"
        closeLabel={config.ui.close}
      >
        <div className="full-menu">
          {config.menuCategories.map((category) => (
            <section key={category.id}>
              <h3>{category.name}</h3>
              <div className="menu-modal-list">{category.items.map(renderItem)}</div>
            </section>
          ))}
        </div>
      </Modal>
    </article>
  );
}
