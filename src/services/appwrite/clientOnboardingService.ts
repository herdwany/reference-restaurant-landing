import { AppwriteException, ExecutionMethod } from "appwrite";
import { functions } from "../../lib/appwriteClient";
import { CREATE_CLIENT_FUNCTION_ID, hasCreateClientFunctionConfig } from "../../lib/appwriteIds";

export type CreateClientInput = {
  businessType: "restaurant" | "cafe" | "bakery" | "cloud_kitchen" | "other";
  notes?: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone?: string;
  plan?: "starter" | "pro" | "premium" | "";
  restaurantName: string;
  restaurantNameAr?: string;
  slug: string;
  status: "draft" | "active";
  temporaryPassword: string;
};

export type CreateClientResult = {
  ownerUserId: string;
  restaurantId: string;
  slug: string;
  warning?: string | null;
};

type CreateClientFunctionResponse = {
  ok?: boolean;
  message?: string;
  ownerUserId?: unknown;
  restaurantId?: unknown;
  slug?: unknown;
  warning?: unknown;
};

type CreateClientErrorCode = "APPWRITE_NOT_CONFIGURED" | "INVALID_INPUT" | "WRITE_FAILED";

export class ClientOnboardingError extends Error {
  code: CreateClientErrorCode;

  constructor(message: string, code: CreateClientErrorCode, cause?: unknown) {
    super(message);
    this.name = "ClientOnboardingError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

export { hasCreateClientFunctionConfig };

const CREATE_CLIENT_NOT_CONFIGURED_MESSAGE = "إعداد إنشاء العملاء غير مفعّل بعد. أضف Function ID.";

const parseFunctionJson = (body: string): CreateClientFunctionResponse => {
  try {
    const parsed: unknown = JSON.parse(body);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed as CreateClientFunctionResponse;
  } catch {
    return {};
  }
};

const getFunctionErrorMessage = (body: string) => {
  const result = parseFunctionJson(body);
  return typeof result.message === "string" && result.message.trim()
    ? result.message
    : "تعذر إنشاء العميل عبر Appwrite Function.";
};

const parseCreateClientResult = (body: string): CreateClientResult => {
  const result = parseFunctionJson(body);

  if (
    result.ok !== true ||
    typeof result.restaurantId !== "string" ||
    typeof result.ownerUserId !== "string" ||
    typeof result.slug !== "string"
  ) {
    throw new ClientOnboardingError("Appwrite Function لم تُرجع بيانات عميل صالحة.", "WRITE_FAILED");
  }

  return {
    ownerUserId: result.ownerUserId,
    restaurantId: result.restaurantId,
    slug: result.slug,
    warning: typeof result.warning === "string" ? result.warning : null,
  };
};

const assertCreateClientConfigured = () => {
  if (!hasCreateClientFunctionConfig) {
    throw new ClientOnboardingError(CREATE_CLIENT_NOT_CONFIGURED_MESSAGE, "APPWRITE_NOT_CONFIGURED");
  }
};

export async function createClientViaFunction(input: CreateClientInput): Promise<CreateClientResult> {
  assertCreateClientConfigured();

  try {
    const execution = await functions.createExecution({
      functionId: CREATE_CLIENT_FUNCTION_ID,
      body: JSON.stringify({
        restaurantName: input.restaurantName.trim(),
        restaurantNameAr: input.restaurantNameAr?.trim() || undefined,
        slug: input.slug.trim().toLowerCase(),
        businessType: input.businessType,
        ownerName: input.ownerName.trim(),
        ownerEmail: input.ownerEmail.trim().toLowerCase(),
        ownerPhone: input.ownerPhone?.trim() || undefined,
        temporaryPassword: input.temporaryPassword,
        status: input.status,
        plan: input.plan || undefined,
        notes: input.notes?.trim() || undefined,
      }),
      async: false,
      method: ExecutionMethod.POST,
      headers: {
        "content-type": "application/json",
      },
    });

    if (execution.status !== "completed" || execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
      throw new ClientOnboardingError(getFunctionErrorMessage(execution.responseBody), "WRITE_FAILED");
    }

    return parseCreateClientResult(execution.responseBody);
  } catch (error) {
    if (error instanceof ClientOnboardingError) {
      throw error;
    }

    if (error instanceof AppwriteException && error.code === 401) {
      throw new ClientOnboardingError("يجب تسجيل الدخول بحساب وكالة لإنشاء عميل.", "WRITE_FAILED", error);
    }

    throw new ClientOnboardingError("تعذر إنشاء العميل عبر Appwrite Function.", "WRITE_FAILED", error);
  }
}
