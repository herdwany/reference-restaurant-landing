import type { FulfillmentType } from "../types/platform";

export type DeliveryAreaOption = {
  fee?: number;
  name: string;
};

type RawDeliveryArea = string | {
  area?: unknown;
  deliveryFee?: unknown;
  fee?: unknown;
  label?: unknown;
  name?: unknown;
};

const toOptionalPositiveNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined;
};

const mapRawDeliveryArea = (item: RawDeliveryArea): DeliveryAreaOption | null => {
  if (typeof item === "string") {
    const name = item.trim();
    return name ? { name } : null;
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const nameValue = item.name ?? item.label ?? item.area;
  const name = typeof nameValue === "string" ? nameValue.trim() : "";

  if (!name) {
    return null;
  }

  const fee = toOptionalPositiveNumber(item.fee ?? item.deliveryFee);
  return fee === undefined ? { name } : { fee, name };
};

export const parseDeliveryAreas = (value: string | undefined): DeliveryAreaOption[] => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) => {
        const mapped = mapRawDeliveryArea(item as RawDeliveryArea);
        return mapped ? [mapped] : [];
      });
    }
  } catch {
    // Fall through to simple text parsing for owner-friendly area lists.
  }

  return trimmed
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
};

export const getAvailableFulfillmentTypes = (settings: {
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
}): FulfillmentType[] => {
  const types: FulfillmentType[] = [];

  if (settings.deliveryEnabled !== false) {
    types.push("delivery");
  }

  if (settings.pickupEnabled === true) {
    types.push("pickup");
  }

  return types.length > 0 ? types : ["delivery"];
};

export const getDeliveryFeeForSelection = (options: {
  areas: readonly DeliveryAreaOption[];
  baseFee: number;
  deliveryArea?: string;
  freeDeliveryThreshold?: number;
  fulfillmentType: FulfillmentType;
  subtotal: number;
}) => {
  if (options.fulfillmentType === "pickup") {
    return 0;
  }

  const selectedArea = options.areas.find((area) => area.name === options.deliveryArea);
  const selectedFee = selectedArea?.fee;
  const fee = typeof selectedFee === "number" ? selectedFee : options.baseFee;

  if (
    typeof options.freeDeliveryThreshold === "number" &&
    Number.isFinite(options.freeDeliveryThreshold) &&
    options.freeDeliveryThreshold > 0 &&
    options.subtotal >= options.freeDeliveryThreshold
  ) {
    return 0;
  }

  return Math.max(0, fee);
};
