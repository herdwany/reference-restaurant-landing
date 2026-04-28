import { CSSProperties, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./admin/AdminLayout";
import AdminLogin from "./admin/AdminLogin";
import AdminOverview from "./admin/AdminOverview";
import ProtectedAdminRoute from "./admin/components/ProtectedAdminRoute";
import AdminActivity from "./admin/pages/AdminActivity";
import AdminDishes from "./admin/pages/AdminDishes";
import AdminFaqs from "./admin/pages/AdminFaqs";
import AdminGallery from "./admin/pages/AdminGallery";
import AdminOffers from "./admin/pages/AdminOffers";
import AdminOrders from "./admin/pages/AdminOrders";
import AdminReservations from "./admin/pages/AdminReservations";
import AdminSettings from "./admin/pages/AdminSettings";
import AgencyDashboard from "./agency/AgencyDashboard";
import type { Dish, GalleryImage, MenuItem, Offer } from "./data/restaurantConfig";
import { restaurantConfig } from "./data/restaurantConfig";
import BookingForm from "./components/BookingForm";
import CartDrawer, { type CheckoutCustomerDetails } from "./components/CartDrawer";
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
import { AuthProvider } from "./context/AuthContext";
import { useCart } from "./hooks/useCart";
import { useToast } from "./hooks/useToast";
import { getSiteData } from "./services/siteDataService";
import type { RestaurantStatus } from "./types/platform";
import {
  OrdersRepositoryError,
  createOrder as createAppwriteOrder,
  createOrderViaFunction,
  hasCreateOrderFunctionConfig,
} from "./services/repositories/ordersRepository";
import { DEFAULT_RESTAURANT_SLUG, canUseDirectSensitiveTableFallback, isDevelopmentBuild, isProductionBuild } from "./lib/appwriteIds";
import { createOrderMessage, createWhatsappUrl, getCartQuantity } from "./utils/formatters";

type ThemeStyle = CSSProperties & Record<string, string>;

const scrollToSection = (targetId: string) => {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function AdminProtectedRoutes() {
  return (
    <AuthProvider>
      <ProtectedAdminRoute />
    </AuthProvider>
  );
}

function AdminLoginRoute() {
  return (
    <AuthProvider>
      <AdminLogin />
    </AuthProvider>
  );
}

function AgencyRoute() {
  return (
    <AuthProvider>
      <AgencyDashboard />
    </AuthProvider>
  );
}

type PublicSiteStatusPageProps = {
  restaurantName: string;
  status: RestaurantStatus;
  style: ThemeStyle;
};

function PublicSiteStatusPage({ restaurantName, status, style }: PublicSiteStatusPageProps) {
  const statusCopy: Record<Exclude<RestaurantStatus, "active">, { body: string; title: string }> = {
    draft: {
      title: "الموقع في وضع المسودة.",
      body: "الموقع قيد التجهيز وسيكون متاحًا قريبًا.",
    },
    suspended: {
      title: "هذا الموقع غير متاح مؤقتًا.",
      body: "تواصل مع Pixel One لتفعيل الموقع مرة أخرى.",
    },
    cancelled: {
      title: "هذا الموقع غير متاح حاليًا.",
      body: "تواصل مع Pixel One لمعرفة حالة الموقع.",
    },
  };
  const copy = status === "active" ? null : statusCopy[status];

  if (!copy) {
    return null;
  }

  return (
    <main className="public-status-page" dir="rtl" style={style}>
      <section className="public-status-card" role="status">
        <span>{restaurantName}</span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
      </section>
    </main>
  );
}

type PublicGalleryCardProps = {
  fallbackImage: string;
  image: GalleryImage;
  onOpen: (image: GalleryImage) => void;
};

function PublicGalleryCard({ fallbackImage, image, onOpen }: PublicGalleryCardProps) {
  const preferredImage = image.imageUrl || image.image || fallbackImage;
  const [imageSrc, setImageSrc] = useState(preferredImage);

  useEffect(() => {
    setImageSrc(preferredImage);
  }, [preferredImage]);

  return (
    <button className="gallery-card" type="button" onClick={() => onOpen({ ...image, image: imageSrc || fallbackImage })}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={image.alt || image.title}
          loading="lazy"
          onError={() => setImageSrc((current) => (current === fallbackImage ? "" : fallbackImage))}
        />
      ) : (
        <div className="gallery-card__fallback" aria-hidden="true" />
      )}
      <span>{image.title}</span>
    </button>
  );
}

function LandingPage() {
  const [config, setConfig] = useState(restaurantConfig);
  const [publicStatus, setPublicStatus] = useState<RestaurantStatus>("active");
  const sections = config.settings.sections;
  const cart = useCart();
  const { toasts, showToast, dismissToast } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSiteData = async () => {
      try {
        const result = await getSiteData();

        if (isMounted) {
          setConfig(result.config);
          setPublicStatus(result.restaurantStatus);
        }
      } catch {
        if (isMounted) {
          setConfig(restaurantConfig);
          setPublicStatus("active");
        }
      }
    };

    void loadSiteData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = config.settings.language || "ar";
    document.documentElement.dir = config.settings.direction || "rtl";
  }, [config.settings.direction, config.settings.language]);

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

  if (publicStatus !== "active") {
    return <PublicSiteStatusPage restaurantName={config.restaurant.name} status={publicStatus} style={themeStyle} />;
  }

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

  const getCheckoutErrorMessage = (error: unknown) => {
    if (error instanceof OrdersRepositoryError) {
      return error.message;
    }

    return "تعذر حفظ الطلب في قاعدة البيانات. يمكنك متابعة الطلب عبر واتساب.";
  };

  const getCheckoutItems = () =>
    cart.items.map((item) => ({
      dishId: item.source === "dish" && config.restaurant.id ? item.sourceId : undefined,
      dishName: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      subtotal: item.price * item.quantity,
    }));

  const openWhatsappOrder = (customer: CheckoutCustomerDetails) => {
    window.open(
      createWhatsappUrl(
        config.restaurant.whatsappNumber,
        createOrderMessage(
          config.restaurant.name,
          cart.items,
          config.restaurant.currency,
          config.restaurant.deliveryFee,
          customer,
        ),
      ),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCheckout = async (customer: CheckoutCustomerDetails) => {
    if (cart.items.length === 0) {
      showToast(config.ui.toasts.cartEmpty, "error");
      return;
    }

    const orderMode = config.settings.orderMode ?? "both";

    if (orderMode === "whatsapp") {
      openWhatsappOrder(customer);
      return;
    }

    if (!hasCreateOrderFunctionConfig && isProductionBuild) {
      showToast(
        orderMode === "both"
          ? "لم يتم تفعيل دالة إنشاء الطلبات في الإنتاج. سيتم فتح واتساب كبديل."
          : "لم يتم تفعيل دالة إنشاء الطلبات في الإنتاج. لا يمكن حفظ الطلب الآن.",
        "error",
      );

      if (orderMode === "both") {
        openWhatsappOrder(customer);
      }

      return;
    }

    if (!hasCreateOrderFunctionConfig && !config.restaurant.id) {
      showToast(
        orderMode === "both" ? "تعذر حفظ الطلب في Appwrite، سيتم فتح واتساب كبديل." : "تعذر حفظ الطلب في Appwrite.",
        "error",
      );

      if (orderMode === "both") {
        openWhatsappOrder(customer);
      }

      return;
    }

    setIsCheckingOut(true);

    try {
      const baseOrderInput = {
        restaurantId: config.restaurant.id ?? "",
        restaurantSlug: DEFAULT_RESTAURANT_SLUG,
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        customerAddress: customer.customerAddress,
        notes: customer.notes,
        deliveryFee: config.restaurant.deliveryFee,
        source: "website" as const,
        items: getCheckoutItems(),
      };

      if (hasCreateOrderFunctionConfig) {
        await createOrderViaFunction(baseOrderInput);
      } else {
        if (!canUseDirectSensitiveTableFallback) {
          throw new OrdersRepositoryError("لا يمكن إنشاء الطلب مباشرة من المتصفح في بيئة الإنتاج.", "APPWRITE_NOT_CONFIGURED");
        }

        if (isDevelopmentBuild) {
          console.warn("Using direct browser createOrder fallback. This path is for development/staging only.");
        }

        await createAppwriteOrder(baseOrderInput);
      }

      showToast("تم حفظ الطلب بنجاح.", "success");

      if (orderMode === "both") {
        openWhatsappOrder(customer);
      }
    } catch (error) {
      showToast(getCheckoutErrorMessage(error), "error");

      if (orderMode === "both") {
        openWhatsappOrder(customer);
      }
    } finally {
      setIsCheckingOut(false);
    }
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
                {config.galleryImages.map((image, index) => (
                  <PublicGalleryCard
                    fallbackImage={restaurantConfig.galleryImages[index % restaurantConfig.galleryImages.length]?.image || restaurantConfig.brand.heroImage}
                    image={image}
                    key={image.id}
                    onOpen={setSelectedGalleryImage}
                  />
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
        isCheckingOut={isCheckingOut}
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
          <img className="gallery-modal-image" src={selectedGalleryImage.image} alt={selectedGalleryImage.alt || selectedGalleryImage.title} />
        ) : null}
      </Modal>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/login" element={<AdminLoginRoute />} />
        <Route path="/agency" element={<AgencyRoute />} />
        <Route path="/admin" element={<AdminProtectedRoutes />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="dishes" element={<AdminDishes />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="faqs" element={<AdminFaqs />} />
            <Route path="gallery" element={<AdminGallery />} />
            <Route path="activity" element={<AdminActivity />} />
            <Route path="*" element={<AdminOverview />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
