import { ExecutionMethod } from "appwrite";
import { functions } from "../../lib/appwriteClient";
import { TRACK_REQUEST_FUNCTION_ID, hasTrackRequestFunctionConfig } from "../../lib/appwriteIds";

type TrackRequestType = "order" | "reservation";

export type TrackRequestInput = {
  restaurantSlug: string;
  phone: string;
  trackingCode: string;
  type?: TrackRequestType;
};

export type TrackRequestResult = {
  found: boolean;
  restaurant?: {
    name: string;
    whatsappNumber: string;
  };
  result?: {
    type: TrackRequestType;
    trackingCode: string;
    status: string;
    createdAt?: string | null;
    totalAmount?: number | null;
    itemCount?: number;
    reservationDate?: string;
    reservationTime?: string;
    peopleCount?: number;
    depositStatus?: string;
    depositAmount?: number | null;
  };
};

export class TrackingRepositoryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TrackingRepositoryError";
    (this as { cause?: unknown }).cause = cause;
  }
}

const parseFunctionError = (body: string | undefined) => {
  if (!body) {
    return "تعذر تتبع الطلب أو الحجز حاليًا.";
  }

  try {
    const parsed: unknown = JSON.parse(body);

    if (parsed && typeof parsed === "object" && "message" in parsed && typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return body;
  }

  return "تعذر تتبع الطلب أو الحجز حاليًا.";
};

export { hasTrackRequestFunctionConfig };

export async function trackRequest(input: TrackRequestInput): Promise<TrackRequestResult> {
  if (!hasTrackRequestFunctionConfig) {
    throw new TrackingRepositoryError("لم يتم تفعيل دالة التتبع بعد.");
  }

  try {
    const execution = await functions.createExecution({
      functionId: TRACK_REQUEST_FUNCTION_ID,
      body: JSON.stringify({
        restaurantSlug: input.restaurantSlug.trim().toLowerCase(),
        phone: input.phone.trim(),
        trackingCode: input.trackingCode.trim().toUpperCase(),
        type: input.type,
      }),
      async: false,
      method: ExecutionMethod.POST,
      headers: {
        "content-type": "application/json",
      },
    });

    if (execution.status !== "completed" || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
      throw new TrackingRepositoryError(parseFunctionError(execution.responseBody));
    }

    const parsed: unknown = JSON.parse(execution.responseBody);

    if (!parsed || typeof parsed !== "object" || !("ok" in parsed)) {
      throw new TrackingRepositoryError("استجابة التتبع غير صالحة.");
    }

    const result = parsed as TrackRequestResult & { ok?: boolean };

    if (!result.ok) {
      throw new TrackingRepositoryError("تعذر تتبع الطلب أو الحجز حاليًا.");
    }

    return {
      found: Boolean(result.found),
      restaurant: result.restaurant,
      result: result.result,
    };
  } catch (error) {
    if (error instanceof TrackingRepositoryError) {
      throw error;
    }

    throw new TrackingRepositoryError("تعذر تتبع الطلب أو الحجز حاليًا.", error);
  }
}
