"use server";

import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { submitAddressSchema } from "./submit-address.schema";
import { isCovered } from "@/lib/checkout/communes";

export type SubmitAddressResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "SESSION_NOT_FOUND" | "SESSION_EXPIRED" | "COMMUNE_NOT_COVERED" | "VALIDATION_ERROR"; message?: string };

export async function submitAddress(input: unknown): Promise<SubmitAddressResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = submitAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  const { sessionId, address } = parsed.data;

  // Load session
  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(and(eq(checkoutSessions.id, sessionId), eq(checkoutSessions.userId, user.id)));

  if (rows.length === 0) return { ok: false, code: "SESSION_NOT_FOUND" };

  const session = rows[0];

  // TTL check
  if (session.expiresAt <= new Date()) return { ok: false, code: "SESSION_EXPIRED" };

  if (session.status === "expired") return { ok: false, code: "SESSION_EXPIRED" };

  // Commune coverage
  if (!isCovered(address.commune)) return { ok: false, code: "COMMUNE_NOT_COVERED" };

  // Update session
  await db
    .update(checkoutSessions)
    .set({ address: address as unknown as Record<string, unknown>, updatedAt: new Date() })
    .where(eq(checkoutSessions.id, sessionId));

  return { ok: true };
}
