import {
  CalendarCheck,
  CircleHelp,
  Eye,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Tag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { AdminFeatureIconName } from "./adminFeatures";

export const adminFeatureIcons: Record<AdminFeatureIconName, LucideIcon> = {
  calendarCheck: CalendarCheck,
  circleHelp: CircleHelp,
  eye: Eye,
  layoutDashboard: LayoutDashboard,
  settings: Settings,
  shoppingBag: ShoppingBag,
  tag: Tag,
  utensils: Utensils,
};
