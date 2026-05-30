/**
 * Folio counter — F3.6
 * Atomic per-type folio increment using SELECT FOR UPDATE, mirroring
 * the order-number.ts / orderSequences pattern.
 * Spec: F-1, F-2, S-2
 */
import { eq } from "drizzle-orm";
import { dtefolioCounters } from "@/db/schema";
import type { DteType } from "@/db/schema";

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
 * Returns the next folio number for the given DTE type.
 * Must be called inside an open transaction (or plain db for tests).
 * Uses SELECT FOR UPDATE to acquire a row-level lock.
 */
export async function getFolioWithDb(
  db: TxLike,
  type: DteType | string,
): Promise<number> {
  // Ensure row exists for this type
  await db
    .insert(dtefolioCounters)
    .values({ type, lastFolio: 0 })
    .onConflictDoNothing();

  // Read current folio with FOR UPDATE lock
  const rows = (await db
    .select({ type: dtefolioCounters.type, lastFolio: dtefolioCounters.lastFolio })
    .from(dtefolioCounters)
    .for("update")
    .where(eq(dtefolioCounters.type, type))) as Array<{ type: string; lastFolio: number }>;

  const current = rows[0]?.lastFolio ?? 0;
  const next = current + 1;

  await db
    .update(dtefolioCounters)
    .set({ lastFolio: next })
    .where(eq(dtefolioCounters.type, type));

  return next;
}
