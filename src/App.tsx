import { CSSProperties, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
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
import TrackingPage from "./components/TrackingPage";
import { AuthProvider } from "./context/AuthContext";
import { useCart } from "./hooks/useCart";
import { useToast } from "./hooks/useToast";
import { useI18n } from "./lib/i18n/I18nContext";
import { getLocalizedContent, getLocalizedField } from "./lib/i18n/localizedContent";
import { getSiteDataBySlug } from "./services/siteDataService";
import type { RestaurantStatus } from "./types/platform";
import {
  OrdersRepositoryError,
  createOrder as createAppwriteOrder,
  createOrderViaFunction,
  hasCreateOrderFunctionConfig,
} from "./services/repositories/ordersRepository";
import { canUseDirectSensitiveTableFallback, isDevelopmentBuild, isProductionBuild } from "./lib/appwriteIds";
import { createOrderMessage, createWhatsappUrl, getCartQuantity } from "./utils/formatters";

type ThemeStyle = CSSProperties & Record<string, string>;

const themePresetColors = {
  classic_red: null,
  black_gold: {
    primaryColor: "#161616",
    secondaryColor: "#b88a2d",
    accentColor: "#f4c76b",
    successColor: "#16a34a",
    darkColor: "#151515",
    lightColor: "#faf7ef",
    borderColor: "#e4d7bc",
  },
  coffee: {
    primaryColor: "#7c3f24",
    secondaryColor: "#b26a34",
    accentColor: "#e7b76b",
    successColor: "#15803d",
    darkColor: "#24150f",
    lightColor: "#fff7ed",
    borderColor: "#ead8c5",
  },
  fresh: {
    primaryColor: "#15803d",
    secondaryColor: "#0f766e",
    accentColor: "#facc15",
    successColor: "#16a34a",
    darkColor: "#10251b",
    lightColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  minimal: {
    primaryColor: "#111827",
    secondaryColor: "#6b7280",
    accentColor: "#d97706",
    successColor: "#16a34a",
    darkColor: "#111827",
    lightColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
} as const;

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

type PublicSiteMessagePageProps = {
  body?: string;
  eyebrow?: string;
  isLoading?: boolean;
  style: ThemeStyle;
  title: string;
};

function PublicSiteMessagePage({ body, eyebrow, isLoading = false, style, title }: PublicSiteMessagePageProps) {
  return (
    <main className="public-status-page" style={style}>
      <section className="public-status-card" role={isLoading ? "status" : "alert"} aria-busy={isLoading}>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h1>{title}</h1>
        {body ? <p>{body}</p> : null}
      </section>
    </main>
  );
}

function PublicSiteAvailabilityPage({ restaurantName, status, style }: PublicSiteStatusPageProps) {
  const { t } = useI18n();
  const titleByStatus: Record<Exclude<RestaurantStatus, "active">, string> = {
    draft: t("siteDraft"),
    suspended: t("siteSuspended"),
    cancelled: t("siteCancelled"),
  };

  return status === "active" ? null : (
    <PublicSiteMessagePage eyebrow={restaurantName} title={titleByStatus[status]} style={style} />
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

type LandingPageProps = {
  slug?: string;
};

function LandingPage({ slug }: LandingPageProps) {
  const { currentLanguage, t } = useI18n();
  const [config, setConfig] = useState(restaurantConfig);
  const [publicStatus, setPublicStatus] = useState<RestaurantStatus>("active");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [isLoadingSite, setIsLoadingSite] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const sections = config.settings.sections;
  const cart = useCart();
  const { toasts, showToast, dismissToast } = useToast();
  const [cartOpen, setCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSiteData = async () => {
      try {
        setIsLoadingSite(true);
        const result = await getSiteDataBySlug(slug);

        if (isMounted) {
          setConfig(result.config);
          setPublicStatus(result.restaurantStatus);
          setRestaurantSlug(result.resolvedSlug);
          setIsNotFound(result.isNotFound);
          setIsLoadingSite(false);
        }
      } catch {
        if (isMounted) {
          setConfig(restaurantConfig);
          setPublicStatus("active");
          setRestaurantSlug(slug?.trim().toLowerCase() || "");
          setIsNotFound(Boolean(slug?.trim()));
          setIsLoadingSite(false);
        }
      }
    };

    void loadSiteData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const localizedConfig = useMemo(() => {
    const settingsTranslationEntity = {
      translations: config.settings.translations,
      heroTitle: config.hero.title,
      heroSubtitle: config.hero.subtitle,
      primaryCtaText: config.hero.primaryCtaText,
      secondaryCtaText: config.hero.secondaryCtaText,
      featuredSectionTitle: config.ui.sectionTitles.featuredDishes,
      offersSectionTitle: config.ui.sectionTitles.offers,
      testimonialsSectionTitle: config.ui.sectionTitles.testimonials,
      contactSectionTitle: config.ui.sectionTitles.actionGrid,
      gallerySectionTitle: config.ui.sectionTitles.gallery,
      faqSectionTitle: config.ui.sectionTitles.faq,
      depositPolicyText: config.settings.depositPolicyText ?? "",
      cancellationPolicyText: config.settings.cancellationPolicyText ?? "",
    };

    return {
      ...config,
      settings: {
        ...config.settings,
        depositPolicyText: getLocalizedField(settingsTranslationEntity, "depositPolicyText", currentLanguage),
        cancellationPolicyText: getLocalizedField(settingsTranslationEntity, "cancellationPolicyText", currentLanguage),
      },
      hero: {
        ...config.hero,
        title: getLocalizedField(settingsTranslationEntity, "heroTitle", currentLanguage),
        subtitle: getLocalizedField(settingsTranslationEntity, "heroSubtitle", currentLanguage),
        primaryCtaText: getLocalizedField(settingsTranslationEntity, "primaryCtaText", currentLanguage) || t("orderNow"),
        secondaryCtaText: getLocalizedField(settingsTranslationEntity, "secondaryCtaText", currentLanguage) || t("whatsapp"),
      },
      ui: {
        ...config.ui,
        orderNow: t("orderNow"),
        addToCart: t("addToCart"),
        details: t("details"),
        quantity: t("quantity"),
        close: t("close"),
        cartButtonLabel: t("cart"),
        booking: {
          ...config.ui.booking,
          title: t("bookTable"),
          submit: t("bookNow"),
          whatsappSubmit: t("sendToWhatsapp"),
          successTitle: t("reservationReceived"),
          successText: t("reservationReceivedBody"),
        },
        sectionTitles: {
          ...config.ui.sectionTitles,
          featuredDishes: getLocalizedField(settingsTranslationEntity, "featuredSectionTitle", currentLanguage) || t("featuredDishes"),
          offers: getLocalizedField(settingsTranslationEntity, "offersSectionTitle", currentLanguage) || t("todayOffers"),
          testimonials: getLocalizedField(settingsTranslationEntity, "testimonialsSectionTitle", currentLanguage) || t("testimonials"),
          actionGrid: getLocalizedField(settingsTranslationEntity, "contactSectionTitle", currentLanguage) || t("contact"),
          gallery: getLocalizedField(settingsTranslationEntity, "gallerySectionTitle", currentLanguage) || t("gallery"),
          faq: getLocalizedField(settingsTranslationEntity, "faqSectionTitle", currentLanguage) || t("faq"),
        },
      },
      dishes: config.dishes.map((dish) => getLocalizedContent(dish, currentLanguage, ["name", "description"])),
      offers: config.offers.map((offer) => getLocalizedContent(offer, currentLanguage, ["title", "description", "ctaText"])),
      faqs: config.faqs.map((faq) => getLocalizedContent(faq, currentLanguage, ["question", "answer"])),
    };
  }, [config, currentLanguage, t]);

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
  const navigationConfig = { ...localizedConfig, navigation: visibleNavigation };
  const themePreset = config.settings.themePreset || "classic_red";
  const presetColors = themePresetColors[themePreset];
  const activeBrand = presetColors ? { ...config.brand, ...presetColors } : config.brand;

  const themeStyle: ThemeStyle = {
    "--color-primary": activeBrand.primaryColor,
    "--color-secondary": activeBrand.secondaryColor,
    "--color-accent": activeBrand.accentColor,
    "--color-success": activeBrand.successColor,
    "--color-dark": activeBrand.darkColor,
    "--color-light": activeBrand.lightColor,
    "--color-border": activeBrand.borderColor,
    "--radius-card": activeBrand.borderRadius,
  };

  if (isLoadingSite) {
    return <PublicSiteMessagePage title={t("loadingSite")} style={themeStyle} isLoading />;
  }

  if (isNotFound) {
    return <PublicSiteMessagePage title={t("notFound")} style={themeStyle} />;
  }

  if (publicStatus !== "active") {
    return <PublicSiteAvailabilityPage restaurantName={config.restaurant.name} status={publicStatus} style={themeStyle} />;
  }

  const currentRestaurantSlug = restaurantSlug || config.restaurant.slug || "";

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
        restaurantSlug: currentRestaurantSlug,
        customerName: customer.customerName,
        customerPhone: customer.customerPhone,
        customerAddress: customer.customerAddress,
        notes: customer.notes,
        deliveryFee: config.restaurant.deliveryFee,
        source: "website" as const,
        items: getCheckoutItems(),
      };

      let createdTrackingCode = "";

      if (hasCreateOrderFunctionConfig) {
        const createdOrder = await createOrderViaFunction(baseOrderInput);
        createdTrackingCode = createdOrder.trackingCode;
      } else {
        if (!canUseDirectSensitiveTableFallback) {
          throw new OrdersRepositoryError("لا يمكن إنشاء الطلب مباشرة من المتصفح في بيئة الإنتاج.", "APPWRITE_NOT_CONFIGURED");
        }

        if (isDevelopmentBuild) {
          console.warn("Using direct browser createOrder fallback. This path is for development/staging only.");
        }

        const createdOrder = await createAppwriteOrder(baseOrderInput);
        createdTrackingCode = createdOrder.order.trackingCode ?? "";
      }

      showToast(createdTrackingCode ? `تم حفظ الطلب بنجاح. رمز التتبع: ${createdTrackingCode}` : "تم حفظ الطلب بنجاح.", "success");

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
      createWhatsappUrl(config.restaurant.whatsappNumber, localizedConfig.ui.whatsappInquiryMessage),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className={`app app--theme-${themePreset}`} style={themeStyle}>
      <Header
        config={navigationConfig}
        cartCount={getCartQuantity(cart.items)}
        onCartOpen={() => setCartOpen(true)}
      />

      <main>
        {sections.hero ? <Hero config={localizedConfig} onOrderClick={handleHeroOrder} onWhatsappClick={handleWhatsappClick} /> : null}
        {sections.trustBadges ? <TrustBadges config={localizedConfig} /> : null}
        {sections.featuredDishes ? <FeaturedDishes config={localizedConfig} onAddToCart={addDishToCart} /> : null}
        {sections.offers ? <Offers config={localizedConfig} onAddToCart={addOfferToCart} /> : null}

        {sections.gallery ? (
          <section className="section gallery-section" id="gallery">
            <div className="container">
              <SectionTitle title={localizedConfig.ui.sectionTitles.gallery} />
              <div className="gallery-grid">
                {localizedConfig.galleryImages.map((image, index) => (
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

        {sections.testimonials ? <Testimonials config={localizedConfig} /> : null}

        {sections.actionGrid ? (
          <section className="section action-grid-section" id="booking">
            <div className="container">
              <SectionTitle title={localizedConfig.ui.sectionTitles.actionGrid} />
              <div className="action-grid">
                <BookingForm config={localizedConfig} restaurantSlug={currentRestaurantSlug} onToast={showToast} />
                <MenuPreview config={localizedConfig} onAddToCart={addMenuItemToCart} />
                <LocationCard config={localizedConfig} onWhatsappClick={handleWhatsappClick} />
              </div>
            </div>
          </section>
        ) : null}

        {sections.faq ? <FAQ config={localizedConfig} /> : null}
      </main>

      {sections.footer ? <Footer config={navigationConfig} /> : null}

      <CartDrawer
        config={localizedConfig}
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
        isOpen={Boolean(selectedGalleryImage)}
        onClose={() => setSelectedGalleryImage(null)}
        title={selectedGalleryImage?.title}
        size="lg"
        closeLabel={localizedConfig.ui.close}
      >
        {selectedGalleryImage ? (
          <img className="gallery-modal-image" src={selectedGalleryImage.image} alt={selectedGalleryImage.alt || selectedGalleryImage.title} />
        ) : null}
      </Modal>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function PublicRestaurantRoute() {
  const { slug } = useParams();
  return <LandingPage slug={slug} />;
}

function PublicTrackingRoute() {
  const { slug } = useParams();
  return <TrackingPage restaurantSlug={slug?.trim().toLowerCase() || "demo-restaurant"} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/r/:slug/track" element={<PublicTrackingRoute />} />
        <Route path="/r/:slug" element={<PublicRestaurantRoute />} />
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
