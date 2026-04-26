import { Query } from "appwrite";
import type { Models } from "appwrite";
import { TABLES } from "../../lib/appwriteIds";
import type { FAQItem } from "../../types/appwriteModels";
import { listRows } from "./readRows";

interface FAQRow extends Models.Row {
  restaurantId: string;
  question: string;
  answer: string;
  isVisible: boolean;
  sortOrder?: number | null;
}

const mapFAQ = (row: FAQRow): FAQItem => ({
  id: row.$id,
  restaurantId: row.restaurantId,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt,
  question: row.question,
  answer: row.answer,
  isVisible: row.isVisible,
  sortOrder: row.sortOrder ?? 0,
});

export async function getVisibleFaqs(restaurantId: string): Promise<FAQItem[]> {
  const rows = await listRows<FAQRow>(TABLES.faqs, [
    Query.equal("restaurantId", restaurantId),
    Query.equal("isVisible", true),
    Query.orderAsc("sortOrder"),
  ]);

  return rows.map(mapFAQ);
}
