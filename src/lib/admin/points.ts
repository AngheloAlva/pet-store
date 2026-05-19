import { db, dbReady } from "@/db";
import { pointsTransactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type PointsTransactionRow = {
  id: string;
  userId: string;
  deltaPoints: number;
  balanceAfter: number;
  kind: string;
  referenceId: string | null;
  description: string;
  createdBy: string | null;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// getUserPointsBalance
// ---------------------------------------------------------------------------
export async function getUserPointsBalance(userId: string): Promise<number> {
  await dbReady;

  const rows = await db
    .select({ balanceAfter: pointsTransactions.balanceAfter })
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId))
    .orderBy(desc(pointsTransactions.createdAt))
    .limit(1);

  return rows[0]?.balanceAfter ?? 0;
}

// ---------------------------------------------------------------------------
// getUserPointsHistory
// ---------------------------------------------------------------------------
export async function getUserPointsHistory(
  userId: string,
  limit = 20,
): Promise<PointsTransactionRow[]> {
  await dbReady;

  return db
    .select()
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId))
    .orderBy(desc(pointsTransactions.createdAt))
    .limit(limit);
}
