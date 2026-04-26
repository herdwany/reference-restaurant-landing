import { CalendarCheck, Eye, ShoppingBag, Tag, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { getRoleLabel } from "./adminLabels";
import { useAuth } from "../context/AuthContext";

const overviewCards = [
  { title: "الأطباق", icon: Utensils },
  { title: "العروض", icon: Tag },
  { title: "الطلبات", icon: ShoppingBag },
  { title: "الحجوزات", icon: CalendarCheck },
];

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
          <p>تم تحميل هوية الحساب ونطاق المطعم من Appwrite. إدارة المحتوى ستأتي في المرحلة القادمة.</p>
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
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className="admin-placeholder-card" key={card.title}>
              <div className="admin-placeholder-card__icon">
                <Icon size={22} aria-hidden="true" />
              </div>
              <div>
                <h3>{card.title}</h3>
                <p>سيتم تفعيلها في المرحلة القادمة</p>
              </div>
              <span>قريبًا</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
