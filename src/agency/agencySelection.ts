import type { Restaurant } from "../types/platform";

export type AgencySelectedRestaurant = {
  selectedRestaurantId: string;
  selectedRestaurantName: string;
  selectedRestaurantSlug: string;
};

const AGENCY_SELECTED_RESTAURANT_KEY = "pixel-one.agency.selectedRestaurant";

const canUseLocalStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

const isAgencySelectedRestaurant = (value: unknown): value is AgencySelectedRestaurant => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AgencySelectedRestaurant>;

  return (
    typeof candidate.selectedRestaurantId === "string" &&
    candidate.selectedRestaurantId.trim().length > 0 &&
    typeof candidate.selectedRestaurantName === "string" &&
    candidate.selectedRestaurantName.trim().length > 0 &&
    typeof candidate.selectedRestaurantSlug === "string"
  );
};

// TODO Phase 9 hardening: this client-side selection is MVP UI context only.
// Enforce agency restaurant access through Teams/Functions/backend rules before production.
export function setAgencySelectedRestaurant(restaurant: Pick<Restaurant, "id" | "name" | "nameAr" | "slug">) {
  if (!canUseLocalStorage()) {
    return;
  }

  const selection: AgencySelectedRestaurant = {
    selectedRestaurantId: restaurant.id,
    selectedRestaurantName: restaurant.nameAr || restaurant.name,
    selectedRestaurantSlug: restaurant.slug,
  };

  window.localStorage.setItem(AGENCY_SELECTED_RESTAURANT_KEY, JSON.stringify(selection));
}

export function getAgencySelectedRestaurant(): AgencySelectedRestaurant | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const storedSelection = window.localStorage.getItem(AGENCY_SELECTED_RESTAURANT_KEY);

    if (!storedSelection) {
      return null;
    }

    const parsedSelection: unknown = JSON.parse(storedSelection);
    return isAgencySelectedRestaurant(parsedSelection) ? parsedSelection : null;
  } catch {
    return null;
  }
}

export function clearAgencySelectedRestaurant() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(AGENCY_SELECTED_RESTAURANT_KEY);
}
