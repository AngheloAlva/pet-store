"use server";

/**
 * select-delivery-type action — F3.3
 * Persists session.deliveryType from the tipo-entrega step.
 */
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const schema = z.object({
  sessionId: z.string().uuid(),
  deliveryType: z.enum(["despacho", "pickup", "courier"]),
});

export type SelectDeliveryTypeResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "SESSION_NOT_FOUND" | "SESSION_EXPIRED" | "VALIDATION_ERROR"; message?: string };

export async function selectDeliveryType(input: unknown): Promise<SelectDeliveryTypeResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  const { sessionId, deliveryType } = parsed.data;

  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(and(eq(checkoutSessions.id, sessionId), eq(checkoutSessions.userId, user.id)));

  if (rows.length === 0) return { ok: false, code: "SESSION_NOT_FOUND" };

  const session = rows[0];
  if (session.expiresAt <= new Date() || session.status === "expired") {
    return { ok: false, code: "SESSION_EXPIRED" };
  }

  await db
    .update(checkoutSessions)
    .set({ deliveryType, updatedAt: new Date() })
    .where(eq(checkoutSessions.id, sessionId));

  return { ok: true };
}
