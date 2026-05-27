/**
 * Idempotency helpers — F3.1
 * Used by confirmOrder to detect already-completed sessions and return
 * the existing order number without repeating side effects.
 */
import { eq } from "drizzle-orm";
import { orders } from "@/db/schema";

type DbLike = {
  select: (fields?: unknown) => {
    from: (table: unknown) => {
      where: (condition: unknown) => {
        limit: (n: number) => Promise<unknown[]>;
      };
    };
  };
};

export interface ExistingOrder {
  id: string;
  orderNumber: string;
}

/**
 * Looks up a completed order by checkout session id.
 * Returns null if no order exists for this session.
 */
export async function findCompletedOrder(
  db: DbLike,
  sessionId: string,
): Promise<ExistingOrder | null> {
  const rows = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.checkoutSessionId, sessionId))
    .limit(1) as Array<{ id: string; orderNumber: string }>;

  if (rows.length === 0) return null;
  return rows[0];
}
