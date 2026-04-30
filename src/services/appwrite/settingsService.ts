import { Query } from "appwrite";
import type { Models } from "appwrite";
import { TABLES } from "../../lib/appwriteIds";
import type {
  BackgroundStyle,
  ButtonStyle,
  CardStyle,
  FontPreset,
  FooterStyle,
  HeaderStyle,
  HeroLayoutPreset,
  HeroMediaType,
  OrderMode,
  ReservationMode,
  SectionSpacing,
  SiteDirection,
  SiteSettings,
  ThemePreset,
} from "../../types/appwriteModels";
import { getFirstRow } from "./readRows";

interface SiteSettingsRow extends Models.Row {
  restaurantId: string;
  currency: string;
  language: string;
  direction: SiteDirection;
  orderMode: OrderMode;
  reservationMode: ReservationMode;
  deliveryEnabled?: boolean | null;
  pickupEnabled?: boolean | null;
  deliveryBaseFee?: number | null;
  freeDeliveryThreshold?: number | null;
  minimumOrderAmount?: number | null;
  estimatedDeliveryMinutes?: string | null;
  deliveryAreas?: string | null;
  deliveryInstructions?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  primaryCtaText?: string | null;
  secondaryCtaText?: string | null;
  heroMediaType?: HeroMediaType | null;
  heroImageUrl?: string | null;
  heroVideoUrl?: string | null;
  heroLayout?: HeroLayoutPreset | null;
  themePreset?: ThemePreset | null;
  fontPreset?: FontPreset | null;
  cardStyle?: CardStyle | null;
  buttonStyle?: ButtonStyle | null;
  headerStyle?: HeaderStyle | null;
  footerStyle?: FooterStyle | null;
  sectionSpacing?: SectionSpacing | null;
  backgroundStyle?: BackgroundStyle | null;
  featuredSectionTitle?: string | null;
  offersSectionTitle?: string | null;
  gallerySectionTitle?: string | null;
  faqSectionTitle?: string | null;
  showHero: boolean;
  showTrustBadges: boolean;
  showFeatured?: boolean | null;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showContact?: boolean | null;
  showFaq: boolean;
  showFooter: boolean;
}

const mapSiteSettings = (row: SiteSettingsRow): SiteSettings => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  currency: row.currency,
  language: row.language,
  direction: row.direction,
  orderMode: row.orderMode,
  reservationMode: row.reservationMode,
  deliveryEnabled: row.deliveryEnabled ?? undefined,
  pickupEnabled: row.pickupEnabled ?? undefined,
  deliveryBaseFee: row.deliveryBaseFee ?? undefined,
  freeDeliveryThreshold: row.freeDeliveryThreshold ?? undefined,
  minimumOrderAmount: row.minimumOrderAmount ?? undefined,
  estimatedDeliveryMinutes: row.estimatedDeliveryMinutes ?? undefined,
  deliveryAreas: row.deliveryAreas ?? undefined,
  deliveryInstructions: row.deliveryInstructions ?? undefined,
  heroTitle: row.heroTitle ?? undefined,
  heroSubtitle: row.heroSubtitle ?? undefined,
  primaryCtaText: row.primaryCtaText ?? undefined,
  secondaryCtaText: row.secondaryCtaText ?? undefined,
  heroMediaType: row.heroMediaType ?? undefined,
  heroImageUrl: row.heroImageUrl ?? undefined,
  heroVideoUrl: row.heroVideoUrl ?? undefined,
  heroLayout: row.heroLayout ?? undefined,
  themePreset: row.themePreset ?? undefined,
  fontPreset: row.fontPreset ?? undefined,
  cardStyle: row.cardStyle ?? undefined,
  buttonStyle: row.buttonStyle ?? undefined,
  headerStyle: row.headerStyle ?? undefined,
  footerStyle: row.footerStyle ?? undefined,
  sectionSpacing: row.sectionSpacing ?? undefined,
  backgroundStyle: row.backgroundStyle ?? undefined,
  featuredSectionTitle: row.featuredSectionTitle ?? undefined,
  offersSectionTitle: row.offersSectionTitle ?? undefined,
  gallerySectionTitle: row.gallerySectionTitle ?? undefined,
  faqSectionTitle: row.faqSectionTitle ?? undefined,
  showHero: row.showHero,
  showTrustBadges: row.showTrustBadges,
  showFeatured: row.showFeatured ?? undefined,
  showFeaturedDishes: row.showFeaturedDishes,
  showOffers: row.showOffers,
  showGallery: row.showGallery,
  showTestimonials: row.showTestimonials,
  showActionGrid: row.showActionGrid,
  showContact: row.showContact ?? undefined,
  showFaq: row.showFaq,
  showFooter: row.showFooter,
});

export async function getSiteSettings(restaurantId: string): Promise<SiteSettings | null> {
  const row = await getFirstRow<SiteSettingsRow>(TABLES.siteSettings, [
    Query.equal("restaurantId", restaurantId),
    Query.limit(1),
  ]);

  return row ? mapSiteSettings(row) : null;
}
