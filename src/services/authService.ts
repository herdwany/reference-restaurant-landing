import { AppwriteException, ID, OAuthProvider, type Models } from "appwrite";
import { account, isAppwriteConfigured } from "../lib/appwriteClient";

export type AuthUser = Models.User<Models.Preferences>;
export type OAuthLoginProvider = "google";

export const APPWRITE_AUTH_NOT_CONFIGURED_MESSAGE = "لم يتم إعداد Appwrite بعد. أضف متغيرات البيئة أولًا.";
export const ADMIN_APPWRITE_REQUIRED_MESSAGE = "لوحة التحكم تحتاج إعداد Appwrite أولًا.";

type AuthServiceErrorCode =
  | "APPWRITE_NOT_CONFIGURED"
  | "EMAIL_VERIFICATION_FAILED"
  | "EMAIL_VERIFICATION_REQUIRED"
  | "OAUTH_LOGIN_FAILED"
  | "PASSWORD_RECOVERY_FAILED"
  | "PASSWORD_RECOVERY_INVALID"
  | "SESSION_MISSING"
  | "GET_CURRENT_USER_FAILED"
  | "LOGIN_FAILED"
  | "LOGOUT_FAILED"
  | "REGISTER_FAILED"
  | "SWITCH_ACCOUNT_FAILED"
  | "EMAIL_ALREADY_USED";

export class AuthServiceError extends Error {
  code: AuthServiceErrorCode;

  constructor(message: string, code: AuthServiceErrorCode, cause?: unknown) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

export const isAppwriteAuthConfigured = () => isAppwriteConfigured;

const requireAppwriteAuth = () => {
  if (!isAppwriteConfigured) {
    throw new AuthServiceError(APPWRITE_AUTH_NOT_CONFIGURED_MESSAGE, "APPWRITE_NOT_CONFIGURED");
  }
};

const isMissingSessionError = (error: unknown) => {
  if (error instanceof AuthServiceError) {
    return error.code === "SESSION_MISSING";
  }

  if (error instanceof AppwriteException) {
    return error.code === 401;
  }

  return false;
};

const isActiveSessionCreationError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes("session is active");
};

const deleteCurrentSessionIfPresent = async () => {
  try {
    await account.deleteSession({ sessionId: "current" });
  } catch (error) {
    if (isMissingSessionError(error)) {
      return;
    }

    throw error;
  }
};

const createEmailPasswordSessionWithRetry = async (email: string, password: string) => {
  try {
    await account.createEmailPasswordSession({ email, password });
  } catch (error) {
    if (!isActiveSessionCreationError(error)) {
      throw error;
    }

    try {
      await deleteCurrentSessionIfPresent();
      await account.createEmailPasswordSession({ email, password });
    } catch (retryError) {
      throw new AuthServiceError(
        "تعذر تبديل الحساب. سجّل الخروج ثم حاول مرة أخرى.",
        "SWITCH_ACCOUNT_FAILED",
        retryError,
      );
    }
  }
};

const oauthProviders: Record<OAuthLoginProvider, OAuthProvider> = {
  google: OAuthProvider.Google,
};

export const buildAppUrl = (path: string, params: Record<string, string | undefined> = {}) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = new URL(path, origin || "http://localhost");

  Object.entries(params).forEach(([key, value]) => {
    if (value?.trim()) {
      url.searchParams.set(key, value.trim());
    }
  });

  return url.toString();
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  requireAppwriteAuth();

  try {
    return await account.get<Models.Preferences>();
  } catch (error) {
    if (isMissingSessionError(error)) {
      return null;
    }

    throw new AuthServiceError("تعذر التحقق من جلسة المستخدم.", "GET_CURRENT_USER_FAILED", error);
  }
};

export const loginWithEmail = async (email: string, password: string): Promise<AuthUser> => {
  requireAppwriteAuth();

  try {
    await createEmailPasswordSessionWithRetry(email, password);
    const user = await getCurrentUser();

    if (!user) {
      throw new AuthServiceError("تم إنشاء الجلسة لكن تعذر قراءة بيانات المستخدم.", "SESSION_MISSING");
    }

    return user;
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error;
    }

    throw new AuthServiceError("تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.", "LOGIN_FAILED", error);
  }
};

const isEmailConflictError = (error: unknown) => {
  if (error instanceof AppwriteException) {
    return error.code === 409;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("already") && (message.includes("email") || message.includes("user"));
  }

  return false;
};

export const registerWithEmail = async (email: string, password: string, name: string): Promise<AuthUser> => {
  requireAppwriteAuth();

  try {
    await account.create({
      userId: ID.unique(),
      email,
      password,
      name,
    });

    await account.createEmailPasswordSession({ email, password });
    const user = await getCurrentUser();

    if (!user) {
      throw new AuthServiceError("تم إنشاء الجلسة لكن تعذر قراءة بيانات المستخدم.", "SESSION_MISSING");
    }

    return user;
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error;
    }

    if (isEmailConflictError(error)) {
      throw new AuthServiceError("البريد الإلكتروني مستخدم بالفعل.", "EMAIL_ALREADY_USED", error);
    }

    throw new AuthServiceError("تعذر إنشاء الحساب. حاول مرة أخرى.", "REGISTER_FAILED", error);
  }
};

export const sendVerificationEmail = async (url: string): Promise<void> => {
  requireAppwriteAuth();

  try {
    await account.createVerification({ url });
  } catch (error) {
    throw new AuthServiceError("تعذر إرسال رابط تأكيد البريد حاليا.", "EMAIL_VERIFICATION_FAILED", error);
  }
};

export const verifyEmail = async (userId: string, secret: string): Promise<void> => {
  requireAppwriteAuth();

  try {
    await account.updateVerification({ userId, secret });
  } catch (error) {
    throw new AuthServiceError("انتهت صلاحية الرابط أو غير صالح.", "EMAIL_VERIFICATION_FAILED", error);
  }
};

export const sendPasswordRecoveryEmail = async (email: string, url: string): Promise<void> => {
  requireAppwriteAuth();

  try {
    await account.createRecovery({ email, url });
  } catch (error) {
    throw new AuthServiceError("تعذر إرسال رابط استعادة كلمة المرور حاليا.", "PASSWORD_RECOVERY_FAILED", error);
  }
};

export const resetPassword = async (userId: string, secret: string, password: string): Promise<void> => {
  requireAppwriteAuth();

  try {
    await account.updateRecovery({ userId, secret, password });
  } catch (error) {
    throw new AuthServiceError("انتهت صلاحية الرابط أو غير صالح.", "PASSWORD_RECOVERY_INVALID", error);
  }
};

export const loginWithOAuthProvider = (
  provider: OAuthLoginProvider,
  successUrl: string,
  failureUrl: string,
): void | string => {
  requireAppwriteAuth();

  try {
    return account.createOAuth2Session({
      provider: oauthProviders[provider],
      success: successUrl,
      failure: failureUrl,
    });
  } catch (error) {
    throw new AuthServiceError("تعذر تسجيل الدخول بواسطة المزود المحدد.", "OAUTH_LOGIN_FAILED", error);
  }
};

export const logout = async (): Promise<void> => {
  requireAppwriteAuth();

  try {
    await account.deleteSession({ sessionId: "current" });
  } catch (error) {
    if (isMissingSessionError(error)) {
      return;
    }

    throw new AuthServiceError("تعذر تسجيل الخروج من Appwrite.", "LOGOUT_FAILED", error);
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  if (!isAppwriteConfigured) {
    return false;
  }

  const user = await getCurrentUser();
  return Boolean(user);
};
