export type BusinessType =
  | "restaurant"
  | "cafe"
  | "bakery"
  | "cloud_kitchen"
  | "salon"
  | "clinic"
  | "gym"
  | "car_rental"
  | "other";

export type UserRole = "agency_admin" | "owner" | "staff";
export type RestaurantStatus = "draft" | "active" | "suspended" | "cancelled";
export type ClientPlan = "starter" | "pro" | "premium" | "managed";
export type BillingStatus = "trial" | "active" | "overdue" | "cancelled";
export type SupportLevel = "basic" | "standard" | "priority" | "managed";
export type DomainType = "pixelone_path" | "subdomain" | "custom_domain";
export type DomainStatus = "not_configured" | "pending_dns" | "pending_verification" | "active" | "failed";
export type FeatureFlagKey = keyof FeatureFlags;
export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled"
  | "rejected";
export type ReservationStatus =
  | "new"
  | "pending_confirmation"
  | "confirmed"
  | "deposit_required"
  | "deposit_paid"
  | "seated"
  | "completed"
  | "no_show"
  | "cancelled"
  | "rejected";
export type DepositStatus = "none" | "required" | "paid" | "waived";
export type OrderSource = "website" | "whatsapp" | "admin";
export type FulfillmentType = "delivery" | "pickup";
export type ColorTheme = "orange" | "red" | "gold";
export type SiteDirection = "rtl" | "ltr";
export type OrderMode = "whatsapp" | "database" | "both";
export type ReservationMode = "whatsapp" | "database" | "both";
export type HeroMediaType = "image" | "video_url";
export type HeroLayoutPreset = "split" | "background" | "centered";
export type ThemePreset = "classic_red" | "black_gold" | "coffee" | "fresh" | "minimal";
export type FontPreset = "modern" | "classic" | "elegant" | "friendly";
export type CardStyle = "soft" | "bordered" | "flat" | "premium";
export type ButtonStyle = "rounded" | "soft" | "sharp" | "premium";
export type HeaderStyle = "clean" | "centered" | "glass" | "solid";
export type FooterStyle = "dark" | "light" | "brand" | "minimal";
export type SectionSpacing = "compact" | "normal" | "wide";
export type BackgroundStyle = "warm" | "clean" | "pattern" | "solid" | "premium";
export type AuditEntityType =
  | "dish"
  | "offer"
  | "settings"
  | "faq"
  | "gallery"
  | "order"
  | "reservation"
  | "image"
  | "auth";
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore"
  | "hide"
  | "show"
  | "activate"
  | "deactivate"
  | "status_change"
  | "upload"
  | "settings_update"
  | "contact_update";
export type AuditLogMetadataValue = string | number | boolean | null;
export type AuditLogMetadata = Record<string, AuditLogMetadataValue>;

export interface BaseModel {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureFlags {
  canManageDishes: boolean;
  canManageOffers: boolean;
  canManageOrders: boolean;
  canManageReservations: boolean;
  canUploadImages: boolean;
  canManageGallery: boolean;
  canCustomizeBrand: boolean;
  canUseCustomDomain: boolean;
  canAccessActivityLogs: boolean;
  canUseAdvancedTheme: boolean;
}

export interface Restaurant extends BaseModel {
  name: string;
  slug: string;
  businessType: BusinessType;
  status: RestaurantStatus;
  plan: ClientPlan;
  billingStatus: BillingStatus;
  subscriptionEndsAt?: string;
  trialEndsAt?: string;
  supportLevel: SupportLevel;
  features?: Partial<FeatureFlags>;
  teamId: string;
  ownerUserId: string;
  nameAr: string;
  tagline: string;
  description: string;
  logoFileId?: string;
  faviconFileId?: string;
  heroImageFileId?: string;
  heroImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  phone: string;
  whatsappNumber: string;
  email?: string;
  address: string;
  mapsUrl?: string;
  mapImageUrl?: string;
  workingHours: string;
  domain?: string;
  domainType: DomainType;
  subdomain?: string;
  customDomain?: string;
  domainStatus: DomainStatus;
  domainNotes?: string;
  domainVerifiedAt?: string;
  dnsTarget?: string;
}

export interface Profile extends BaseModel {
  userId: string;
  restaurantId?: string;
  teamId?: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  isActive: boolean;
}

export interface CustomerProfile extends BaseModel {
  restaurantId: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  defaultAddress?: string;
  city?: string;
  deliveryNotes?: string;
  isActive: boolean;
}

export interface Dish extends BaseModel {
  restaurantId: string;
  name: string;
  description: string;
  translations?: string;
  price: number;
  oldPrice?: number;
  imageFileId?: string;
  imageUrl?: string;
  badge?: string;
  category: string;
  rating?: number;
  isPopular: boolean;
  isAvailable: boolean;
  ingredients?: string[];
  sortOrder?: number;
}

export interface Offer extends BaseModel {
  restaurantId: string;
  title: string;
  description: string;
  translations?: string;
  price: number;
  oldPrice?: number;
  imageFileId?: string;
  imageUrl?: string;
  colorTheme: ColorTheme;
  ctaText: string;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  sortOrder?: number;
}

export interface GalleryItem extends BaseModel {
  restaurantId: string;
  title: string;
  alt: string;
  imageFileId?: string;
  imageUrl?: string;
  isVisible: boolean;
  sortOrder?: number;
}

export interface Testimonial extends BaseModel {
  restaurantId: string;
  name: string;
  text: string;
  rating: number;
  avatarFileId?: string;
  avatarUrl?: string;
  role?: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface FAQItem extends BaseModel {
  restaurantId: string;
  question: string;
  answer: string;
  translations?: string;
  isVisible: boolean;
  sortOrder: number;
}

export interface SiteSettings extends BaseModel {
  restaurantId: string;
  currency: string;
  language: string;
  direction: SiteDirection;
  orderMode: OrderMode;
  reservationMode: ReservationMode;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  deliveryBaseFee?: number;
  freeDeliveryThreshold?: number;
  minimumOrderAmount?: number;
  estimatedDeliveryMinutes?: string;
  deliveryAreas?: string;
  deliveryInstructions?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  heroMediaType?: HeroMediaType;
  heroImageUrl?: string;
  heroVideoUrl?: string;
  heroLayout?: HeroLayoutPreset;
  themePreset?: ThemePreset;
  fontPreset?: FontPreset;
  cardStyle?: CardStyle;
  buttonStyle?: ButtonStyle;
  headerStyle?: HeaderStyle;
  footerStyle?: FooterStyle;
  sectionSpacing?: SectionSpacing;
  backgroundStyle?: BackgroundStyle;
  featuredSectionTitle?: string;
  offersSectionTitle?: string;
  gallerySectionTitle?: string;
  testimonialsSectionTitle?: string;
  contactSectionTitle?: string;
  faqSectionTitle?: string;
  translations?: string;
  requireManualReservationConfirmation?: boolean;
  requireDepositForLargeGroups?: boolean;
  depositThresholdPeople?: number;
  depositAmount?: number;
  depositPolicyText?: string;
  cancellationPolicyText?: string;
  maxPeoplePerReservation?: number;
  hideCompletedOrdersFromMainList?: boolean;
  hideCancelledOrdersFromMainList?: boolean;
  showPastReservationsInSeparateTab?: boolean;
  enableManualArchiveActions?: boolean;
  autoArchiveCompletedOrders?: boolean;
  orderAutoArchiveAfterHours?: number;
  autoArchiveCompletedReservations?: boolean;
  reservationAutoArchiveAfterHours?: number;
  showHero: boolean;
  showFeatured?: boolean;
  showTrustBadges: boolean;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showContact?: boolean;
  showFaq: boolean;
  showFooter: boolean;
}

export interface Order extends BaseModel {
  restaurantId: string;
  customerUserId?: string;
  customerProfileId?: string;
  trackingCode?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  fulfillmentType?: FulfillmentType;
  deliveryArea?: string;
  deliveryFee?: number;
  deliveryNotes?: string;
  notes?: string;
  totalAmount: number;
  status: OrderStatus;
  source: OrderSource;
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
}

export interface OrderItem extends BaseModel {
  restaurantId: string;
  orderId: string;
  dishId?: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Reservation extends BaseModel {
  restaurantId: string;
  customerUserId?: string;
  customerProfileId?: string;
  trackingCode?: string;
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  peopleCount: number;
  notes?: string;
  status: ReservationStatus;
  depositStatus?: DepositStatus;
  depositAmount?: number;
  depositNotes?: string;
  confirmationNotes?: string;
  policyAccepted?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
}

export interface AuditLog extends BaseModel {
  restaurantId?: string;
  userId?: string;
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId?: string;
  metadata?: AuditLogMetadata;
}
