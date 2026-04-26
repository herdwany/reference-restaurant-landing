import { ShoppingBag } from "lucide-react";
import { type SyntheticEvent } from "react";
import type { Offer, RestaurantConfig } from "../data/restaurantConfig";
import { formatPrice } from "../utils/formatters";
import SectionTitle from "./SectionTitle";

interface OffersProps {
  config: RestaurantConfig;
  onAddToCart: (offer: Offer) => void;
}

export default function Offers({ config, onAddToCart }: OffersProps) {
  const fallbackImage = config.offers[0]?.image || config.brand.heroImage;

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.dataset.fallbackApplied === "true") {
      return;
    }

    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = fallbackImage;
  };

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
                  {offer.oldPrice ? <del>{formatPrice(offer.oldPrice, config.restaurant.currency)}</del> : null}
                </div>
                <button type="button" onClick={() => onAddToCart(offer)}>
                  <ShoppingBag size={18} />
                  {offer.ctaText}
                </button>
              </div>
              <img src={offer.imageUrl || offer.image} alt={offer.title} loading="lazy" onError={handleImageError} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
