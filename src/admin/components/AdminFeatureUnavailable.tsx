import { LockKeyhole } from "lucide-react";
import AdminErrorState from "./AdminErrorState";

type AdminFeatureUnavailableProps = {
  featureName: string;
};

export default function AdminFeatureUnavailable({ featureName }: AdminFeatureUnavailableProps) {
  return (
    <AdminErrorState
      title={`ميزة ${featureName} غير متاحة`}
      message={`هذه الميزة غير متاحة في باقتك الحالية. تواصل مع Pixel One لتفعيل هذه الميزة.`}
      action={<LockKeyhole size={18} aria-hidden="true" />}
    />
  );
}
