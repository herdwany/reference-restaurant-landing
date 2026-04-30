import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { mapKnownErrorToFriendlyMessage } from "../../lib/friendlyErrors";
import { useI18n } from "../../lib/i18n/I18nContext";
import {
  StorageServiceError,
  uploadRestaurantAsset,
  validateRestaurantAssetFile,
  type RestaurantAssetType,
  type UploadedRestaurantAsset,
} from "../../services/appwrite/storageService";

export type AdminImageValue = {
  imageFileId?: string;
  imageUrl?: string;
};

type AdminImageUploaderProps = {
  disabled?: boolean;
  onChange: (value: AdminImageValue) => void;
  onUploaded?: (asset: UploadedRestaurantAsset) => void;
  restaurantId: string;
  type: RestaurantAssetType;
  value: AdminImageValue;
};

type Translate = ReturnType<typeof useI18n>["t"];

const getAcceptedImageTypes = (type: RestaurantAssetType) =>
  type === "favicon" ? "image/png,image/webp" : "image/jpeg,image/png,image/webp";

const getUploadErrorMessage = (error: unknown, t: Translate, type: RestaurantAssetType) => {
  if (error instanceof StorageServiceError) {
    const normalizedMessage = error.message.toLowerCase();

    if (
      normalizedMessage.includes("jpg") ||
      normalizedMessage.includes("png") ||
      normalizedMessage.includes("webp") ||
      normalizedMessage.includes("صيغة")
    ) {
      return t("invalidImageType");
    }

    if (type === "favicon" && normalizedMessage.includes("1mb")) {
      return t("faviconTooLarge");
    }

    if (normalizedMessage.includes("3mb") || normalizedMessage.includes("mb") || normalizedMessage.includes("حجم")) {
      return t("imageTooLarge");
    }

    if (error.code === "APPWRITE_NOT_CONFIGURED") {
      return t("appwriteSetupRequired");
    }

    if (error.code === "AUTH_REQUIRED") {
      return t("accessDenied");
    }

    if (error.code === "INVALID_INPUT") {
      return t("invalidValue");
    }

    if (error.code === "UPLOAD_FAILED") {
      return t("uploadFailed");
    }
  }

  return mapKnownErrorToFriendlyMessage(error, t);
};

export default function AdminImageUploader({
  disabled = false,
  onChange,
  onUploaded,
  restaurantId,
  type,
  value,
}: AdminImageUploaderProps) {
  const { t } = useI18n();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const previewImageUrl = selectedFilePreviewUrl || value.imageUrl || "";

  const handleFileSelection = (file: File | null) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    try {
      validateRestaurantAssetFile(file, type);
      setSelectedFile(file);
    } catch (error) {
      setSelectedFile(null);
      setErrorMessage(getUploadErrorMessage(error, t, type));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage(t("chooseImage"));
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const uploadedAsset = await uploadRestaurantAsset(selectedFile, {
        restaurantId,
        type,
      });

      onChange({
        imageFileId: uploadedAsset.fileId,
        imageUrl: uploadedAsset.imageUrl,
      });
      onUploaded?.(uploadedAsset);
      setSelectedFile(null);
      setSuccessMessage(t("imageUploaded"));
    } catch (error) {
      setErrorMessage(getUploadErrorMessage(error, t, type));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFromForm = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setSuccessMessage(t("removeImage"));
    onChange({
      imageFileId: undefined,
      imageUrl: undefined,
    });
  };

  return (
    <div className="admin-image-uploader">
      <div className="admin-image-uploader__preview">
        {previewImageUrl ? (
          <img src={previewImageUrl} alt={t("previewImage")} loading="lazy" />
        ) : (
          <div className="admin-image-uploader__placeholder">
            <ImagePlus size={28} aria-hidden="true" />
            <span>{t("noImage")}</span>
          </div>
        )}
      </div>

      <div className="admin-image-uploader__controls">
        <label className="admin-image-uploader__picker">
          <span>{t("chooseImage")}</span>
          <input
            type="file"
            accept={getAcceptedImageTypes(type)}
            disabled={disabled || isUploading}
            onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
          />
        </label>

        {selectedFile ? <span className="admin-image-uploader__file-name">{selectedFile.name}</span> : null}

        <div className="admin-image-uploader__actions">
          <button
            className="admin-action-button admin-action-button--secondary"
            type="button"
            onClick={() => void handleUpload()}
            disabled={disabled || isUploading || !selectedFile}
          >
            <Upload size={16} aria-hidden="true" />
            <span>{isUploading ? t("uploadingImage") : t("uploadImage")}</span>
          </button>

          {(value.imageUrl || selectedFile) ? (
            <button
              className="admin-action-button admin-action-button--ghost"
              type="button"
              onClick={handleRemoveFromForm}
              disabled={disabled || isUploading}
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>{t("removeImage")}</span>
            </button>
          ) : null}
        </div>

        {errorMessage ? <div className="admin-feedback admin-feedback--error">{errorMessage}</div> : null}
        {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}
      </div>
    </div>
  );
}
