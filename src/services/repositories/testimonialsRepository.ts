import { Query, type Models } from "appwrite";
import { COLLECTIONS } from "../../lib/appwriteIds";
import type { Testimonial } from "../../types/platform";
import { listRows } from "./readRows";

interface TestimonialRow extends Models.Row {
  restaurantId: string;
  name: string;
  text: string;
  rating: number;
  avatarFileId?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  isVisible: boolean;
  sortOrder?: number | null;
}

const mapTestimonial = (row: TestimonialRow): Testimonial => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  name: row.name,
  text: row.text,
  rating: row.rating,
  avatarFileId: row.avatarFileId ?? undefined,
  avatarUrl: row.avatarUrl ?? undefined,
  role: row.role ?? undefined,
  isVisible: row.isVisible,
  sortOrder: row.sortOrder ?? 0,
});

export async function getVisibleTestimonials(restaurantId: string): Promise<Testimonial[]> {
  const rows = await listRows<TestimonialRow>(COLLECTIONS.testimonials, [
    Query.equal("restaurantId", restaurantId),
    Query.equal("isVisible", true),
    Query.orderAsc("sortOrder"),
  ]);

  return rows.map(mapTestimonial);
}
