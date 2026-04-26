import { ShoppingBag } from "lucide-react";
import type { Offer, RestaurantConfig } from "../data/restaurantConfig";
import { formatPrice } from "../utils/formatters";
import SectionTitle from "./SectionTitle";

interface OffersProps {
  config: RestaurantConfig;
  onAddToCart: (offer: Offer) => void;
}

export default function Offers({ config, onAddToCart }: OffersProps) {
  return (
    <section className="section offers-section" id="offers">
      <div className="container">
        <SectionTitle title={config.ui.sectionTitles.offers} />
        <div className="offers-grid">
          {config.offers.map((offer) => (
            <article className={`offer-card offer-card--${offer.colorTheme}`} key={offer.id}>
              <div className="offer-card__content">
                <h3>{offer.title}</h3>
                <p>{offer.description}</p>
                <div className="offer-card__price">
                  <strong>{formatPrice(offer.price, config.restaurant.currency)}</strong>
                  <del>{formatPrice(offer.oldPrice, config.restaurant.currency)}</del>
                </div>
                <button type="button" onClick={() => onAddToCart(offer)}>
                  <ShoppingBag size={18} />
                  {offer.ctaText}
                </button>
              </div>
              <img src={offer.image} alt={offer.title} loading="lazy" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
