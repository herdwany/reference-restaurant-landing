import { Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminFeatureIcons } from "./adminFeatureIcons";
import { adminMainFeatures } from "./adminFeatures";
import { getRoleLabel } from "./adminLabels";

const overviewCards = adminMainFeatures.filter((feature) => feature.id !== "overview");

export default function AdminOverview() {
  const { currentUser, profile, restaurant, restaurantId, role } = useAuth();
  const displayName = profile?.fullName || currentUser?.name || currentUser?.email || "مستخدم اللوحة";
  const displayEmail = profile?.email || currentUser?.email || "غير متوفر";
  const roleLabel = getRoleLabel(role);
  const restaurantName = restaurant?.nameAr || restaurant?.name || (restaurantId ? "غير متاح" : "غير مرتبط");

  return (
    <section className="admin-overview">
      <div className="admin-overview__hero">
        <div>
          <span>مرحبًا بك</span>
          <h2>{displayName}</h2>
          <p>تم تحميل هوية الحساب ونطاق المطعم من Appwrite. يمكنك الآن إدارة الأطباق والمنيو من لوحة التحكم.</p>
        </div>
        <Link className="admin-primary-link" to="/">
          <Eye size={19} aria-hidden="true" />
          <span>معاينة الموقع</span>
        </Link>
      </div>

      <div className="admin-identity-card" aria-label="بيانات الحساب">
        <div>
          <span>اسم الحساب</span>
          <strong>{displayName}</strong>
        </div>
        <div>
          <span>البريد</span>
          <strong>{displayEmail}</strong>
        </div>
        <div>
          <span>الدور</span>
          <strong>{roleLabel}</strong>
        </div>
        <div>
          <span>المطعم</span>
          <strong>{restaurantName}</strong>
        </div>
        {restaurantId ? (
          <div className="admin-identity-card__debug">
            <span>Restaurant ID</span>
            <code>{restaurantId}</code>
          </div>
        ) : null}
      </div>

      <div className="admin-overview__grid">
        {overviewCards.map((feature) => {
          const Icon = adminFeatureIcons[feature.icon];
          const cardContent = (
            <>
              <div className="admin-placeholder-card__icon">
                <Icon size={22} aria-hidden="true" />
              </div>
              <div>
                <h3>{feature.label}</h3>
                <p>{feature.description}</p>
              </div>
              <span>{feature.status === "active" ? "متاح" : "قريبًا"}</span>
            </>
          );

          if (feature.status === "active") {
            return (
              <Link className="admin-placeholder-card admin-placeholder-card--link" to={feature.path} key={feature.id}>
                {cardContent}
              </Link>
            );
          }

          return (
            <article className="admin-placeholder-card" key={feature.id}>
              {cardContent}
            </article>
          );
        })}
      </div>
    </section>
  );
}
