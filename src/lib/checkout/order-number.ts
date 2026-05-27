/**
 * Order number generator — F3.1
 * Uses SELECT ... FOR UPDATE on order_sequences for concurrency safety.
 * Format: PET-YYYYMMDD-NNNNN (zero-padded 5 digits).
 */
import { eq } from "drizzle-orm";
import { orderSequences } from "@/db/schema";

type TxLike = {
  select: (fields?: unknown) => {
    from: (table: unknown) => {
      for: (mode: "update") => {
        where: (condition: unknown) => Promise<unknown[]>;
      };
      where: (condition: unknown) => Promise<unknown[]>;
    };
  };
  update: (table: unknown) => {
    set: (values: unknown) => {
      where: (condition: unknown) => Promise<unknown>;
    };
  };
  insert: (table: unknown) => {
    values: (values: unknown) => {
      onConflictDoNothing: () => Promise<unknown>;
    };
  };
};

/**
 * Generates the next order number for the given date (YYYYMMDD format).
 * Must be called inside an open transaction.
 * Uses SELECT FOR UPDATE to acquire a row-level lock, ensuring that concurrent
 * confirmOrder calls on the same date receive distinct, sequential order numbers.
 */
export async function generateOrderNumber(
  date: string,
  tx: TxLike,
): Promise<string> {
  // Ensure row exists for this date
  await tx
    .insert(orderSequences)
    .values({ date, lastSeq: 0 })
    .onConflictDoNothing();

  // Read current sequence with FOR UPDATE lock
  const rows = await tx
    .select({ date: orderSequences.date, lastSeq: orderSequences.lastSeq })
    .from(orderSequences)
    .for("update")
    .where(eq(orderSequences.date, date)) as Array<{ date: string; lastSeq: number }>;

  const current = rows[0]?.lastSeq ?? 0;
  const next = current + 1;

  // Increment sequence
  await tx
    .update(orderSequences)
    .set({ lastSeq: next })
    .where(eq(orderSequences.date, date));

  // Format: PET-YYYYMMDD-NNNNN (5-digit zero-padded)
  const seq = String(next).padStart(5, "0");
  return `PET-${date}-${seq}`;
}

/**
 * Returns today's date as YYYYMMDD string.
 */
export function todayDate(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
