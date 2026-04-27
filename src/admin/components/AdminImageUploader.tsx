import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import {
  StorageServiceError,
  uploadRestaurantAsset,
  validateRestaurantAssetFile,
  type RestaurantAssetType,
} from "../../services/appwrite/storageService";

export type AdminImageValue = {
  imageFileId?: string;
  imageUrl?: string;
};

type AdminImageUploaderProps = {
  disabled?: boolean;
  onChange: (value: AdminImageValue) => void;
  restaurantId: string;
  type: RestaurantAssetType;
  value: AdminImageValue;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof StorageServiceError) {
    return error.message;
  }

  return "تعذر رفع الصورة. تحقق من الاتصال أو صلاحيات التخزين.";
};

export default function AdminImageUploader({
  disabled = false,
  onChange,
  restaurantId,
  type,
  value,
}: AdminImageUploaderProps) {
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
      validateRestaurantAssetFile(file);
      setSelectedFile(file);
    } catch (error) {
      setSelectedFile(null);
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("اختر صورة أولًا قبل الرفع.");
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
      setSelectedFile(null);
      setSuccessMessage("تم رفع الصورة بنجاح.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFromForm = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setSuccessMessage("تمت إزالة الصورة من النموذج.");
    onChange({
      imageFileId: undefined,
      imageUrl: undefined,
    });
  };

  return (
    <div className="admin-image-uploader">
      <div className="admin-image-uploader__preview">
        {previewImageUrl ? (
          <img src={previewImageUrl} alt="معاينة الصورة" loading="lazy" />
        ) : (
          <div className="admin-image-uploader__placeholder">
            <ImagePlus size={28} aria-hidden="true" />
            <span>لا توجد صورة</span>
          </div>
        )}
      </div>

      <div className="admin-image-uploader__controls">
        <label className="admin-image-uploader__picker">
          <span>اختر صورة</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
            <span>{isUploading ? "جارٍ الرفع..." : "رفع الصورة"}</span>
          </button>

          {(value.imageUrl || selectedFile) ? (
            <button
              className="admin-action-button admin-action-button--ghost"
              type="button"
              onClick={handleRemoveFromForm}
              disabled={disabled || isUploading}
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>إزالة الصورة</span>
            </button>
          ) : null}
        </div>

        {errorMessage ? <div className="admin-feedback admin-feedback--error">{errorMessage}</div> : null}
        {successMessage ? <div className="admin-feedback admin-feedback--success">{successMessage}</div> : null}
      </div>
    </div>
  );
}
