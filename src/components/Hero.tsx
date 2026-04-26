import { Clock, Flame, MessageCircle, ShieldCheck, ShoppingBag, Sparkles, Star, Truck, Leaf } from "lucide-react";
import type { Benefit, RestaurantConfig } from "../data/restaurantConfig";

interface HeroProps {
  config: RestaurantConfig;
  onOrderClick: () => void;
  onWhatsappClick: () => void;
}

const benefitIcons: Record<Benefit["icon"], typeof Star> = {
  star: Star,
  chef: Sparkles,
  leaf: Leaf,
  bike: Truck,
  shield: ShieldCheck,
  clock: Clock,
  flame: Flame,
  card: ShieldCheck,
};

export default function Hero({ config, onOrderClick, onWhatsappClick }: HeroProps) {
  return (
    <section className="hero" id="home">
      <div className="hero__pattern" aria-hidden="true" />
      <div className="container hero__grid">
        <div className="hero__copy">
          <span className="hero__badge">
            <Star size={18} />
            {config.hero.badgeText}
          </span>
          <h1>{config.hero.title}</h1>
          <p>{config.hero.subtitle}</p>

          <div className="hero__actions">
            <button className="primary-button" type="button" onClick={onOrderClick}>
              <ShoppingBag size={21} />
              {config.hero.primaryCtaText}
            </button>
            <button className="whatsapp-button" type="button" onClick={onWhatsappClick}>
              <MessageCircle size={21} />
              {config.hero.secondaryCtaText}
            </button>
          </div>

          <div className="hero__benefits">
            {config.quickBenefits.map((benefit) => {
              const Icon = benefitIcons[benefit.icon];
              return (
                <span key={benefit.title}>
                  <Icon size={17} />
                  {benefit.title}
                </span>
              );
            })}
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero__image-wrap">
            <img src={config.hero.image} alt={config.hero.title} loading="eager" />
            <span className="hero__image-badge">
              <Flame size={18} />
              {config.hero.imageBadge}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
