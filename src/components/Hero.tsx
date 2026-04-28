import { useEffect, useState } from "react";
import { Clock, Flame, MessageCircle, ShieldCheck, ShoppingBag, Sparkles, Star, Truck, Leaf } from "lucide-react";
import { defaultRestaurantConfig, type Benefit, type RestaurantConfig } from "../data/restaurantConfig";

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
  const fallbackHeroImage = defaultRestaurantConfig.hero.image;
  const [heroImageSrc, setHeroImageSrc] = useState(config.hero.image || fallbackHeroImage);
  const [videoFailed, setVideoFailed] = useState(false);
  const heroLayout = config.hero.layout || "split";
  const canShowHeroVideo = config.hero.mediaType === "video_url" && Boolean(config.hero.videoUrl) && !videoFailed;

  useEffect(() => {
    setHeroImageSrc(config.hero.image || fallbackHeroImage);
    setVideoFailed(false);
  }, [config.hero.image, fallbackHeroImage]);

  return (
    <section className={`hero hero--layout-${heroLayout}`} id="home">
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
          <div className={`hero__image-wrap${canShowHeroVideo ? " hero__image-wrap--video" : ""}`}>
            {canShowHeroVideo ? (
              <video
                src={config.hero.videoUrl}
                poster={heroImageSrc || fallbackHeroImage}
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVideoFailed(true)}
              />
            ) : heroImageSrc ? (
              <img
                src={heroImageSrc}
                alt={config.hero.title}
                loading="eager"
                onError={() => setHeroImageSrc((current) => (current === fallbackHeroImage ? "" : fallbackHeroImage))}
              />
            ) : (
              <div className="hero__image-fallback" aria-hidden="true">
                <Sparkles size={54} />
              </div>
            )}
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
