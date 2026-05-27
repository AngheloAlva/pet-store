"use server";

import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getShippingCost, getOptionsForCommune } from "@/lib/checkout/shipping";
import { getAppSettings } from "@/app/actions/admin/settings";

const selectShippingSchemaV2 = z.object({
  sessionId: z.string().uuid(),
  shippingOptionId: z.string().min(1),
  dispatchSlot: z.string().optional(),
  commune: z.string().optional(),
  regionKey: z.string().optional(),
});

export type SelectShippingResult =
  | { ok: true; shippingCost: number }
  | { ok: false; code: "UNAUTHENTICATED" | "SESSION_NOT_FOUND" | "SESSION_EXPIRED" | "INVALID_SHIPPING_OPTION" | "VALIDATION_ERROR" | "COMMUNE_NOT_COVERED"; message?: string };

export async function selectShipping(input: unknown): Promise<SelectShippingResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = selectShippingSchemaV2.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  const { sessionId, shippingOptionId, dispatchSlot, commune, regionKey } = parsed.data;

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

  // Resolve shipping cost
  let cost: number | null = null;

  // F3.3: carrier-aware lookup when commune is provided
  if (commune) {
    const settings = await getAppSettings();
    const options = await getOptionsForCommune(commune, settings, 0, regionKey ?? "RM");
    const option = options.find((o) => o.id === shippingOptionId);
    if (!option) return { ok: false, code: "INVALID_SHIPPING_OPTION" };
    cost = option.cost;
  } else {
    // F3.1 legacy path
    cost = getShippingCost(shippingOptionId);
    if (cost === null) return { ok: false, code: "INVALID_SHIPPING_OPTION" };
  }

  // Persist dispatchSlot when carrier = propio
  if (dispatchSlot && shippingOptionId === "propio") {
    await db
      .update(checkoutSessions)
      .set({ shippingOptionId, shippingCost: cost, dispatchSlot, updatedAt: new Date() })
      .where(eq(checkoutSessions.id, sessionId));
  } else {
    await db
      .update(checkoutSessions)
      .set({ shippingOptionId, shippingCost: cost, updatedAt: new Date() })
      .where(eq(checkoutSessions.id, sessionId));
  }

  return { ok: true, shippingCost: cost };
}
