import { Bike, ChefHat, Leaf, ShieldCheck, Sparkles, Star } from "lucide-react";
import type { Feature, RestaurantConfig } from "../data/restaurantConfig";

const icons: Record<Feature["icon"], typeof Star> = {
  star: Star,
  chef: ChefHat,
  leaf: Leaf,
  bike: Bike,
  shield: ShieldCheck,
  clock: Sparkles,
  flame: Sparkles,
  card: ShieldCheck,
};

interface TrustBadgesProps {
  config: RestaurantConfig;
}

export default function TrustBadges({ config }: TrustBadgesProps) {
  return (
    <section className="trust-section" id="about">
      <div className="container">
        <div className="trust-grid">
          {config.features.map((feature) => {
            const Icon = icons[feature.icon];
            return (
              <article className="trust-card" key={feature.title}>
                <span className="trust-card__icon">
                  <Icon size={24} />
                </span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
