import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { RestaurantConfig } from "../data/restaurantConfig";

interface LocationCardProps {
  config: RestaurantConfig;
  onWhatsappClick: () => void;
}

export default function LocationCard({ config, onWhatsappClick }: LocationCardProps) {
  return (
    <article className="info-card location-card" id="contact">
      <h3>
        <MapPin size={23} />
        {config.ui.location.title}
      </h3>
      <p>{config.restaurant.workingHours}</p>
      <a className="map-preview" href={config.restaurant.mapUrl} target="_blank" rel="noreferrer">
        <img src={config.restaurant.mapImage} alt={config.restaurant.address} loading="lazy" />
      </a>
      <div className="contact-list">
        <a href={config.restaurant.mapUrl} target="_blank" rel="noreferrer">
          <MapPin size={18} />
          {config.restaurant.address}
        </a>
        <a href={`tel:${config.restaurant.phone.replace(/\s/g, "")}`}>
          <Phone size={18} />
          {config.restaurant.phone}
        </a>
        <a href={`mailto:${config.restaurant.email}`}>
          <Mail size={18} />
          {config.restaurant.email}
        </a>
      </div>
      <div className="location-card__actions">
        <button className="primary-button primary-button--wide" type="button" onClick={onWhatsappClick}>
          <MessageCircle size={19} />
          {config.ui.location.whatsapp}
        </button>
        <a className="map-button" href={config.restaurant.mapUrl} target="_blank" rel="noreferrer">
          {config.ui.location.openMap}
        </a>
      </div>
    </article>
  );
}
