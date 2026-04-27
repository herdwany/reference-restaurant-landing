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
export type RestaurantStatus = "draft" | "active" | "suspended";
export type OrderStatus = "new" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
export type ReservationStatus = "new" | "confirmed" | "cancelled" | "completed";
export type OrderSource = "website" | "whatsapp" | "admin";
export type ColorTheme = "orange" | "red" | "gold";
export type SiteDirection = "rtl" | "ltr";
export type OrderMode = "whatsapp" | "database" | "both";
export type ReservationMode = "whatsapp" | "database" | "both";
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

export interface Restaurant extends BaseModel {
  name: string;
  slug: string;
  businessType: BusinessType;
  status: RestaurantStatus;
  teamId: string;
  ownerUserId: string;
  nameAr: string;
  tagline: string;
  description: string;
  logoFileId?: string;
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

export interface Dish extends BaseModel {
  restaurantId: string;
  name: string;
  description: string;
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
  showHero: boolean;
  showTrustBadges: boolean;
  showFeaturedDishes: boolean;
  showOffers: boolean;
  showGallery: boolean;
  showTestimonials: boolean;
  showActionGrid: boolean;
  showFaq: boolean;
  showFooter: boolean;
}

export interface Order extends BaseModel {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
  totalAmount: number;
  status: OrderStatus;
  source: OrderSource;
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
  customerName: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  peopleCount: number;
  notes?: string;
  status: ReservationStatus;
}

export interface AuditLog extends BaseModel {
  restaurantId?: string;
  userId?: string;
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId?: string;
  metadata?: AuditLogMetadata;
}
