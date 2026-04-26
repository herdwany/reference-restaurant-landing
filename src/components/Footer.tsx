import { AtSign, Camera, Instagram, Mail, MapPin, Music2, Phone, UtensilsCrossed } from "lucide-react";
import type { RestaurantConfig } from "../data/restaurantConfig";

interface FooterProps {
  config: RestaurantConfig;
}

const scrollToTarget = (targetId: string) => {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Footer({ config }: FooterProps) {
  const quickLinks = config.navigation.filter((link) => ["home", "menu", "offers", "about", "contact"].includes(link.targetId));

  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <div className="footer-brand">
            <span>
              <UtensilsCrossed size={24} />
            </span>
            <div>
              <strong>{config.restaurant.name}</strong>
              <small>{config.restaurant.slogan}</small>
            </div>
          </div>
          <p>{config.ui.footer.description}</p>
        </div>

        <div>
          <h3>{config.ui.footer.contactTitle}</h3>
          <ul className="footer-list">
            <li>
              <Phone size={17} />
              <a href={`tel:${config.restaurant.phone.replace(/\s/g, "")}`}>{config.restaurant.phone}</a>
            </li>
            <li>
              <AtSign size={17} />
              <a href={`https://wa.me/${config.restaurant.whatsappNumber}`} target="_blank" rel="noreferrer">
                {config.restaurant.whatsappNumber}
              </a>
            </li>
            <li>
              <Mail size={17} />
              <a href={`mailto:${config.restaurant.email}`}>{config.restaurant.email}</a>
            </li>
            <li>
              <MapPin size={17} />
              <a href={config.restaurant.mapUrl} target="_blank" rel="noreferrer">
                {config.restaurant.address}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3>{config.ui.footer.quickLinksTitle}</h3>
          <ul className="footer-links">
            {quickLinks.map((link) => (
              <li key={link.targetId}>
                <button type="button" onClick={() => scrollToTarget(link.targetId)}>
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>{config.ui.footer.socialTitle}</h3>
          <div className="social-links">
            <a href={config.socialLinks.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <a href={config.socialLinks.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
              <Music2 size={20} />
            </a>
            <a href={config.socialLinks.snapchat} target="_blank" rel="noreferrer" aria-label="Snapchat">
              <Camera size={20} />
            </a>
            <a href={config.socialLinks.x} target="_blank" rel="noreferrer" aria-label="X">
              <AtSign size={20} />
            </a>
          </div>
          <div className="payments">
            {config.paymentMethods.map((method) => (
              <span key={method.id}>{method.label}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="site-footer__bottom">
        <div className="container">
          <span>
            {config.ui.footer.copyrightPrefix} {config.restaurant.name} {config.ui.footer.copyrightYear}
          </span>
          <div>
            <a href="#home">{config.ui.footer.privacy}</a>
            <a href="#home">{config.ui.footer.terms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
