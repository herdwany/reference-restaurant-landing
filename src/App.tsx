import { CSSProperties, useState } from "react";
import type { Dish, GalleryImage, MenuItem, Offer } from "./data/restaurantConfig";
import { restaurantConfig } from "./data/restaurantConfig";
import BookingForm from "./components/BookingForm";
import CartDrawer from "./components/CartDrawer";
import FAQ from "./components/FAQ";
import FeaturedDishes from "./components/FeaturedDishes";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import LocationCard from "./components/LocationCard";
import MenuPreview from "./components/MenuPreview";
import Modal from "./components/Modal";
import Offers from "./components/Offers";
import SectionTitle from "./components/SectionTitle";
import Testimonials from "./components/Testimonials";
import Toast from "./components/Toast";
import TrustBadges from "./components/TrustBadges";
import { useCart } from "./hooks/useCart";
import { useToast } from "./hooks/useToast";
import { createOrderMessage, createWhatsappUrl, getCartQuantity } from "./utils/formatters";

type ThemeStyle = CSSProperties & Record<string, string>;

const scrollToSection = (targetId: string) => {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function App() {
  const config = restaurantConfig;
  const sections = config.settings.sections;
  const cart = useCart();
  const { toasts, showToast, dismissToast } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);
  const sectionByTargetId: Record<string, keyof typeof sections> = {
    home: "hero",
    menu: "featuredDishes",
    offers: "offers",
    about: "trustBadges",
    gallery: "gallery",
    testimonials: "testimonials",
    booking: "actionGrid",
    contact: "actionGrid",
    faq: "faq",
  };
  const visibleNavigation = config.navigation.filter((link) => sections[sectionByTargetId[link.targetId] ?? "hero"]);
  const navigationConfig = { ...config, navigation: visibleNavigation };

  const themeStyle: ThemeStyle = {
    "--color-primary": config.brand.primaryColor,
    "--color-secondary": config.brand.secondaryColor,
    "--color-accent": config.brand.accentColor,
    "--color-success": config.brand.successColor,
    "--color-dark": config.brand.darkColor,
    "--color-light": config.brand.lightColor,
    "--color-border": config.brand.borderColor,
    "--radius-card": config.brand.borderRadius,
  };

  const addDishToCart = (dish: Dish, quantity = 1) => {
    cart.addItem(dish, "dish", quantity);
    showToast(config.ui.toasts.added, "success");
  };

  const addOfferToCart = (offer: Offer) => {
    cart.addItem(
      {
        id: offer.id,
        name: offer.title,
        price: offer.price,
        image: offer.image,
      },
      "offer",
    );
    showToast(config.ui.toasts.added, "success");
  };

  const addMenuItemToCart = (item: MenuItem) => {
    cart.addItem(item, "menu");
    showToast(config.ui.toasts.added, "success");
  };

  const handleRemoveCartItem = (id: string) => {
    cart.removeItem(id);
    showToast(config.ui.toasts.removed, "info");
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      showToast(config.ui.toasts.cartEmpty, "error");
      return;
    }

    window.open(
      createWhatsappUrl(
        config.restaurant.whatsappNumber,
        createOrderMessage(config.restaurant.name, cart.items, config.restaurant.currency, config.restaurant.deliveryFee),
      ),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleHeroOrder = () => {
    if (cart.items.length > 0) {
      setCartOpen(true);
      return;
    }

    scrollToSection("menu");
  };

  const handleWhatsappClick = () => {
    window.open(
      createWhatsappUrl(config.restaurant.whatsappNumber, config.ui.whatsappInquiryMessage),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="app" style={themeStyle}>
      <Header
        config={navigationConfig}
        cartCount={getCartQuantity(cart.items)}
        onCartOpen={() => setCartOpen(true)}
        onTemplateOpen={() => setTemplateOpen(true)}
      />

      <main>
        {sections.hero ? <Hero config={config} onOrderClick={handleHeroOrder} onWhatsappClick={handleWhatsappClick} /> : null}
        {sections.trustBadges ? <TrustBadges config={config} /> : null}
        {sections.featuredDishes ? <FeaturedDishes config={config} onAddToCart={addDishToCart} /> : null}
        {sections.offers ? <Offers config={config} onAddToCart={addOfferToCart} /> : null}

        {sections.gallery ? (
          <section className="section gallery-section" id="gallery">
            <div className="container">
              <SectionTitle title={config.ui.sectionTitles.gallery} />
              <div className="gallery-grid">
                {config.galleryImages.map((image) => (
                  <button className="gallery-card" type="button" key={image.id} onClick={() => setSelectedGalleryImage(image)}>
                    <img src={image.image} alt={image.title} loading="lazy" />
                    <span>{image.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {sections.testimonials ? <Testimonials config={config} /> : null}

        {sections.actionGrid ? (
          <section className="section action-grid-section" id="booking">
            <div className="container">
              <SectionTitle title={config.ui.sectionTitles.actionGrid} />
              <div className="action-grid">
                <BookingForm config={config} onToast={showToast} />
                <MenuPreview config={config} onAddToCart={addMenuItemToCart} />
                <LocationCard config={config} onWhatsappClick={handleWhatsappClick} />
              </div>
            </div>
          </section>
        ) : null}

        {sections.faq ? <FAQ config={config} /> : null}
      </main>

      {sections.footer ? <Footer config={navigationConfig} /> : null}

      <CartDrawer
        config={config}
        isOpen={cartOpen}
        items={cart.items}
        onClose={() => setCartOpen(false)}
        onIncrement={cart.incrementItem}
        onDecrement={cart.decrementItem}
        onRemove={handleRemoveCartItem}
        onCheckout={handleCheckout}
      />

      <Modal
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
        title={config.ui.editableTemplateModal.title}
        closeLabel={config.ui.close}
      >
        <div className="template-modal">
          <p>{config.ui.editableTemplateModal.text}</p>
          <ul>
            {config.ui.editableTemplateModal.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <code>src/data/restaurantConfig.ts</code>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(selectedGalleryImage)}
        onClose={() => setSelectedGalleryImage(null)}
        title={selectedGalleryImage?.title}
        size="lg"
        closeLabel={config.ui.close}
      >
        {selectedGalleryImage ? (
          <img className="gallery-modal-image" src={selectedGalleryImage.image} alt={selectedGalleryImage.title} />
        ) : null}
      </Modal>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
