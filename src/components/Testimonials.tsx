import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { RestaurantConfig } from "../data/restaurantConfig";
import { useI18n } from "../lib/i18n/I18nContext";
import SectionTitle from "./SectionTitle";

interface TestimonialsProps {
  config: RestaurantConfig;
}

const getVisibleTestimonials = <T,>(items: T[], start: number, count: number) =>
  Array.from({ length: Math.min(count, items.length) }, (_, index) => items[(start + index) % items.length]);

export default function Testimonials({ config }: TestimonialsProps) {
  const { t } = useI18n();
  const [startIndex, setStartIndex] = useState(0);
  const testimonials = useMemo(
    () => getVisibleTestimonials(config.testimonials, startIndex, 3),
    [config.testimonials, startIndex],
  );

  const move = (step: number) => {
    setStartIndex((current) => (current + step + config.testimonials.length) % config.testimonials.length);
  };

  return (
    <section className="section testimonials-section" id="testimonials">
      <div className="container">
        <SectionTitle title={config.ui.sectionTitles.testimonials} />
        <div className="section-toolbar">
          <button className="icon-button carousel-button" type="button" onClick={() => move(1)} aria-label={t("next")}>
            <ChevronRight size={22} />
          </button>
          <button className="icon-button carousel-button" type="button" onClick={() => move(-1)} aria-label={t("previous")}>
            <ChevronLeft size={22} />
          </button>
        </div>

        <div className="testimonials-grid" key={startIndex}>
          {testimonials.map((testimonial) => (
            <article className="testimonial-card" key={`${testimonial.name}-${testimonial.text}`}>
              <div className="stars" aria-label={t("ratingOutOfFive").replace("{rating}", String(testimonial.rating))}>
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={index} size={18} fill="currentColor" />
                ))}
              </div>
              <p>{testimonial.text}</p>
              <div className="testimonial-card__person">
                <img src={testimonial.avatar} alt={testimonial.name} loading="lazy" />
                <div>
                  <strong>{testimonial.name}</strong>
                  {testimonial.role ? <span>{testimonial.role}</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
