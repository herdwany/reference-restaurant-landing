import { useEffect, useState } from "react";
import { Menu, PencilLine, ShoppingCart, UtensilsCrossed, X } from "lucide-react";
import type { NavLink, RestaurantConfig } from "../data/restaurantConfig";

interface HeaderProps {
  config: RestaurantConfig;
  cartCount: number;
  onCartOpen: () => void;
  onTemplateOpen: () => void;
}

const scrollToTarget = (targetId: string) => {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Header({ config, cartCount, onCartOpen, onTemplateOpen }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTarget, setActiveTarget] = useState(config.navigation[0]?.targetId ?? "home");
  const [logoImageFailed, setLogoImageFailed] = useState(false);
  const logoImageUrl = config.restaurant.logoImage && !logoImageFailed ? config.restaurant.logoImage : "";

  useEffect(() => {
    setLogoImageFailed(false);
  }, [config.restaurant.logoImage]);

  useEffect(() => {
    const sectionIds = config.navigation.map((link) => link.targetId).concat(["faq", "booking"]);

    const onScroll = () => {
      let currentId = config.navigation[0]?.targetId ?? "home";
      const orderedSections = sectionIds
        .map((id) => document.getElementById(id))
        .filter((section): section is HTMLElement => Boolean(section))
        .sort((first, second) => first.offsetTop - second.offsetTop);

      for (const section of orderedSections) {
        if (section.getBoundingClientRect().top <= 120) {
          currentId = section.id;
        }
      }

      setActiveTarget(currentId === "booking" ? "contact" : currentId);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [config.navigation]);

  const handleNavClick = (link: NavLink) => {
    scrollToTarget(link.targetId);
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <button
          className="icon-button site-header__hamburger"
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <button className="brand" type="button" onClick={() => scrollToTarget("home")} aria-label={config.restaurant.name}>
          <span className={`brand__icon ${logoImageUrl ? "brand__icon--image" : ""}`}>
            {logoImageUrl ? (
              <img src={logoImageUrl} alt="" loading="eager" onError={() => setLogoImageFailed(true)} />
            ) : (
              <UtensilsCrossed size={25} />
            )}
          </span>
          <span>
            <strong>{config.restaurant.logoText}</strong>
            <small>{config.restaurant.slogan}</small>
          </span>
        </button>

        <nav className={`main-nav ${menuOpen ? "main-nav--open" : ""}`} aria-label="التنقل الرئيسي">
          {config.navigation.map((link) => (
            <button
              key={link.targetId}
              className={activeTarget === link.targetId ? "is-active" : ""}
              type="button"
              onClick={() => handleNavClick(link)}
            >
              {link.label}
            </button>
          ))}
          <button className="main-nav__mobile-order" type="button" onClick={() => handleNavClick({ label: "", targetId: "menu" })}>
            {config.hero.primaryCtaText}
          </button>
        </nav>

        <div className="site-header__actions">
          <button className="cart-trigger" type="button" onClick={onCartOpen} aria-label={config.ui.cartButtonLabel}>
            <ShoppingCart size={19} />
            <span>{cartCount}</span>
          </button>
          <button className="pill-button pill-button--red site-header__template" type="button" onClick={onTemplateOpen}>
            <PencilLine size={18} />
            {config.ui.templateButton}
          </button>
        </div>
      </div>
    </header>
  );
}
