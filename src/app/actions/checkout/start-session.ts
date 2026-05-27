"use server";

import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { startCheckoutSessionSchema } from "./start-session.schema";
import { reprice } from "@/lib/checkout/repricer";
import { SESSION_TTL_MINUTES } from "@/lib/checkout/session-repo";

export type StartCheckoutSessionResult =
  | { ok: true; sessionId: string; expiresAt: string }
  | { ok: false; code: "UNAUTHENTICATED" | "CART_EMPTY" | "PRODUCT_UNAVAILABLE" | "PRICE_CHANGED" | "VALIDATION_ERROR"; message?: string };

export async function startCheckoutSession(
  input: unknown,
): Promise<StartCheckoutSessionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, code: "UNAUTHENTICATED" };
  }

  const parsed = startCheckoutSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  const { idempotencyKey, cartLines } = parsed.data;

  if (cartLines.length === 0) {
    return { ok: false, code: "CART_EMPTY" };
  }

  // Check for existing session with same idempotency key
  const existing = await db
    .select({ id: checkoutSessions.id, expiresAt: checkoutSessions.expiresAt })
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.idempotencyKey, idempotencyKey),
        eq(checkoutSessions.userId, user.id),
      ),
    );

  if (existing.length > 0) {
    const sess = existing[0];
    return { ok: true, sessionId: sess.id, expiresAt: sess.expiresAt.toISOString() };
  }

  // Re-price from DB inside a transaction
  let repriceResult: Awaited<ReturnType<typeof reprice>>;

  try {
    repriceResult = await db.transaction(async (tx) => {
      return reprice(cartLines, tx as never);
    });
  } catch {
    return { ok: false, code: "PRODUCT_UNAVAILABLE", message: "Failed to reprice cart" };
  }

  if (!repriceResult.ok) {
    return { ok: false, code: "PRICE_CHANGED", message: repriceResult.detail };
  }

  // Expire any existing active sessions for this user
  const now = new Date();
  await db
    .update(checkoutSessions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(checkoutSessions.userId, user.id),
        eq(checkoutSessions.status, "active"),
      ),
    );

  // Create new session
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60 * 1000);

  await db.insert(checkoutSessions).values({
    id: sessionId,
    userId: user.id,
    idempotencyKey,
    cartSnapshot: (repriceResult as { ok: true; lines: unknown[] }).lines as Record<string, unknown>[],
    status: "active",
    expiresAt,
  });

  return { ok: true, sessionId, expiresAt: expiresAt.toISOString() };
}
