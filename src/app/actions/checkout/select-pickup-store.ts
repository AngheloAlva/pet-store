"use server";

/**
 * select-pickup-store action — F3.3
 * Persists session.pickupStoreId after validating the store exists.
 */
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions, stores } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const schema = z.object({
  sessionId: z.string().uuid(),
  storeId: z.string().min(1),
});

export type SelectPickupStoreResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "SESSION_NOT_FOUND" | "SESSION_EXPIRED" | "STORE_NOT_FOUND" | "VALIDATION_ERROR"; message?: string };

export async function selectPickupStore(input: unknown): Promise<SelectPickupStoreResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  const { sessionId, storeId } = parsed.data;

  const sessionRows = await db
    .select()
    .from(checkoutSessions)
    .where(and(eq(checkoutSessions.id, sessionId), eq(checkoutSessions.userId, user.id)));

  if (sessionRows.length === 0) return { ok: false, code: "SESSION_NOT_FOUND" };

  const session = sessionRows[0];
  if (session.expiresAt <= new Date() || session.status === "expired") {
    return { ok: false, code: "SESSION_EXPIRED" };
  }

  // Validate store exists
  const storeRows = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.id, storeId));

  if (storeRows.length === 0) return { ok: false, code: "STORE_NOT_FOUND" };

  await db
    .update(checkoutSessions)
    .set({ pickupStoreId: storeId, deliveryType: "pickup", updatedAt: new Date() })
    .where(eq(checkoutSessions.id, sessionId));

  return { ok: true };
}
