import { AppwriteException, ID, Permission, Role, type Models } from "appwrite";
import { account, storage } from "../../lib/appwriteClient";
import { BUCKET_ID, hasAppwriteStorageConfig } from "../../lib/appwriteIds";

export type RestaurantAssetType = "dish" | "offer" | "logo" | "favicon" | "hero" | "gallery";

export type UploadRestaurantAssetOptions = {
  restaurantId: string;
  type: RestaurantAssetType;
};

export type UploadedRestaurantAsset = {
  fileId: string;
  imageUrl: string;
  previewUrl: string;
  viewUrl: string;
  fileName: string;
};

type StorageServiceErrorCode =
  | "APPWRITE_NOT_CONFIGURED"
  | "INVALID_INPUT"
  | "AUTH_REQUIRED"
  | "UPLOAD_FAILED"
  | "DELETE_FAILED";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_FAVICON_FILE_SIZE_BYTES = 1 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const allowedFaviconMimeTypes = ["image/png", "image/webp"] as const;

export class StorageServiceError extends Error {
  code: StorageServiceErrorCode;

  constructor(message: string, code: StorageServiceErrorCode, cause?: unknown) {
    super(message);
    this.name = "StorageServiceError";
    this.code = code;
    (this as { cause?: unknown }).cause = cause;
  }
}

const assertStorageReady = () => {
  if (!hasAppwriteStorageConfig || !BUCKET_ID) {
    throw new StorageServiceError("لم يتم إعداد Appwrite Storage بعد.", "APPWRITE_NOT_CONFIGURED");
  }
};

const assertRestaurantId = (restaurantId: string) => {
  if (!restaurantId.trim()) {
    throw new StorageServiceError("تعذر تحديد المطعم الحالي.", "INVALID_INPUT");
  }
};

const assertFileId = (fileId: string) => {
  if (!fileId.trim()) {
    throw new StorageServiceError("تعذر تحديد الملف المطلوب.", "INVALID_INPUT");
  }
};

const isAllowedMimeType = (value: string): value is (typeof allowedMimeTypes)[number] =>
  allowedMimeTypes.includes(value as (typeof allowedMimeTypes)[number]);

const isAllowedFaviconMimeType = (value: string): value is (typeof allowedFaviconMimeTypes)[number] =>
  allowedFaviconMimeTypes.includes(value as (typeof allowedFaviconMimeTypes)[number]);

const getFileExtension = (mimeType: string) => {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "img";
  }
};

const sanitizeFilePart = (value: string, fallback: string) => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");

  return sanitized || fallback;
};

const getSafeFileName = (file: File, options: UploadRestaurantAssetOptions) => {
  const extension = getFileExtension(file.type);
  const nameWithoutExtension = file.name.replace(/\.[^.]+$/, "");
  const safeRestaurantId = sanitizeFilePart(options.restaurantId, "restaurant");
  const safeType = sanitizeFilePart(options.type, "asset");
  const safeOriginalName = sanitizeFilePart(nameWithoutExtension, "image").slice(0, 48);

  return `${safeRestaurantId}-${safeType}-${Date.now()}-${safeOriginalName}.${extension}`;
};

const toUploadPermissions = (userId: string) => [
  Permission.read(Role.any()),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

const getUploadErrorMessage = (error: unknown) => {
  if (error instanceof StorageServiceError) {
    return error.message;
  }

  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر رفع الصورة. تحقق من الاتصال أو صلاحيات التخزين.";
  }

  return "تعذر رفع الصورة. تحقق من الاتصال أو صلاحيات التخزين.";
};

const getDeleteErrorMessage = (error: unknown) => {
  if (error instanceof StorageServiceError) {
    return error.message;
  }

  if (error instanceof AppwriteException && (error.code === 401 || error.code === 403)) {
    return "تعذر حذف الصورة. تحقق من صلاحيات التخزين.";
  }

  return "تعذر حذف الصورة. تحقق من الاتصال أو صلاحيات التخزين.";
};

export const validateRestaurantAssetFile = (file: File, type: RestaurantAssetType = "gallery") => {
  const isFavicon = type === "favicon";
  const maxFileSize = isFavicon ? MAX_FAVICON_FILE_SIZE_BYTES : MAX_FILE_SIZE_BYTES;

  if (isFavicon && !isAllowedFaviconMimeType(file.type)) {
    throw new StorageServiceError("صيغة أيقونة تبويب المتصفح غير مدعومة. استخدم PNG أو WebP.", "INVALID_INPUT");
  }

  if (!isFavicon && !isAllowedMimeType(file.type)) {
    throw new StorageServiceError("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.", "INVALID_INPUT");
  }

  if (isFavicon && file.size > maxFileSize) {
    throw new StorageServiceError("Favicon image is too large. Maximum size is 1MB.", "INVALID_INPUT");
  }

  if (file.size > maxFileSize) {
    throw new StorageServiceError("حجم الصورة كبير جدًا. الحد الأقصى 3MB.", "INVALID_INPUT");
  }
};

export const getFilePreviewUrl = (fileId: string) => {
  assertStorageReady();
  assertFileId(fileId);

  return storage.getFilePreview({
    bucketId: BUCKET_ID,
    fileId,
    width: 1200,
    height: 1200,
    quality: 88,
  });
};

export const getFileViewUrl = (fileId: string) => {
  assertStorageReady();
  assertFileId(fileId);

  return storage.getFileView({
    bucketId: BUCKET_ID,
    fileId,
  });
};

export async function uploadRestaurantAsset(
  file: File,
  options: UploadRestaurantAssetOptions,
): Promise<UploadedRestaurantAsset> {
  assertStorageReady();
  assertRestaurantId(options.restaurantId);
  validateRestaurantAssetFile(file, options.type);

  let currentUser: Models.User<Models.Preferences> | null = null;

  try {
    currentUser = await account.get<Models.Preferences>();
  } catch (error) {
    throw new StorageServiceError("يجب تسجيل الدخول قبل رفع الصور.", "AUTH_REQUIRED", error);
  }

  try {
    const safeFileName = getSafeFileName(file, options);
    const uploadableFile = new File([file], safeFileName, { type: file.type, lastModified: file.lastModified });
    const createdFile = await storage.createFile({
      bucketId: BUCKET_ID,
      fileId: ID.unique(),
      file: uploadableFile,
      permissions: toUploadPermissions(currentUser.$id),
    });

    const viewUrl = getFileViewUrl(createdFile.$id);
    const previewUrl = getFilePreviewUrl(createdFile.$id);

    return {
      fileId: createdFile.$id,
      imageUrl: viewUrl,
      previewUrl,
      viewUrl,
      fileName: createdFile.name,
    };
  } catch (error) {
    throw new StorageServiceError(getUploadErrorMessage(error), "UPLOAD_FAILED", error);
  }
}

export async function deleteRestaurantAsset(fileId: string): Promise<void> {
  assertStorageReady();
  assertFileId(fileId);

  try {
    await storage.deleteFile({
      bucketId: BUCKET_ID,
      fileId,
    });
  } catch (error) {
    throw new StorageServiceError(getDeleteErrorMessage(error), "DELETE_FAILED", error);
  }
}

// TODO: في الإنتاج، الأفضل ضبط upload عبر Appwrite Function أو صلاحيات أدق على مستوى الفريق.
// TODO: نظّف الصور غير المستخدمة لاحقًا عند فشل حفظ الصف أو عند استبدال الصور القديمة.
