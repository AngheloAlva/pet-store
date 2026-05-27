"use server";

import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { selectShippingSchema } from "./select-shipping.schema";
import { getShippingCost } from "@/lib/checkout/shipping";

export type SelectShippingResult =
  | { ok: true; shippingCost: number }
  | { ok: false; code: "UNAUTHENTICATED" | "SESSION_NOT_FOUND" | "SESSION_EXPIRED" | "INVALID_SHIPPING_OPTION" | "VALIDATION_ERROR"; message?: string };

export async function selectShipping(input: unknown): Promise<SelectShippingResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = selectShippingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  const { sessionId, shippingOptionId } = parsed.data;

  // Load session
  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(and(eq(checkoutSessions.id, sessionId), eq(checkoutSessions.userId, user.id)));

  if (rows.length === 0) return { ok: false, code: "SESSION_NOT_FOUND" };

  const session = rows[0];

  if (session.expiresAt <= new Date() || session.status === "expired") {
    return { ok: false, code: "SESSION_EXPIRED" };
  }

  // Validate shipping option
  const cost = getShippingCost(shippingOptionId);
  if (cost === null) return { ok: false, code: "INVALID_SHIPPING_OPTION" };

  // Update session
  await db
    .update(checkoutSessions)
    .set({ shippingOptionId, shippingCost: cost, updatedAt: new Date() })
    .where(eq(checkoutSessions.id, sessionId));

  return { ok: true, shippingCost: cost };
}
