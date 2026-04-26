import { CalendarCheck, Eye, ShoppingBag, Tag, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const overviewCards = [
  { title: "الأطباق", icon: Utensils },
  { title: "العروض", icon: Tag },
  { title: "الطلبات", icon: ShoppingBag },
  { title: "الحجوزات", icon: CalendarCheck },
];

export default function AdminOverview() {
  const { currentUser } = useAuth();
  const displayName = currentUser?.name || currentUser?.email || "مستخدم اللوحة";

  return (
    <section className="admin-overview">
      <div className="admin-overview__hero">
        <div>
          <span>مرحبًا بك</span>
          <h2>{displayName}</h2>
          <p>تم تفعيل هيكل لوحة التحكم والدخول عبر Appwrite Auth. إدارة المحتوى ستأتي في المرحلة القادمة.</p>
        </div>
        <Link className="admin-primary-link" to="/">
          <Eye size={19} aria-hidden="true" />
          <span>معاينة الموقع</span>
        </Link>
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
