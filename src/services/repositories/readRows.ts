import type { Models } from "appwrite";
import { databases } from "../../lib/appwriteClient";
import { DATABASE_ID, hasAppwriteDataConfig } from "../../lib/appwriteIds";

export async function listRows<Row extends Models.Row>(
  tableId: string,
  queries: string[] = [],
): Promise<Row[]> {
  if (!hasAppwriteDataConfig) {
    return [];
  }

  try {
    const response = await databases.listRows<Row>({
      databaseId: DATABASE_ID,
      tableId,
      queries,
    });

    return response.rows;
  } catch {
    return [];
  }
}

export async function getFirstRow<Row extends Models.Row>(
  tableId: string,
  queries: string[] = [],
): Promise<Row | null> {
  const rows = await listRows<Row>(tableId, queries);
  return rows[0] ?? null;
}
