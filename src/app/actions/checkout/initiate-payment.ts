"use server";

import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { initiatePaymentSchema } from "./initiate-payment.schema";
import { getGateway } from "@/lib/payments/registry";

export type InitiatePaymentResult =
  | { ok: true; token: string; redirectUrl: string }
  | { ok: false; code: "UNAUTHENTICATED" | "SESSION_NOT_FOUND" | "SESSION_EXPIRED" | "ADDRESS_MISSING" | "SHIPPING_MISSING" | "VALIDATION_ERROR"; message?: string };

export async function initiatePayment(input: unknown): Promise<InitiatePaymentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = initiatePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  const { sessionId, gateway } = parsed.data;

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

  // Guard: already pending — return existing token
  if (session.status === "payment_pending") {
    const gatewayToken = (session as unknown as { gatewayToken?: string }).gatewayToken;
    if (gatewayToken) {
      return {
        ok: true,
        token: gatewayToken,
        redirectUrl: `/checkout/resultado?paymentId=${sessionId}&token=${gatewayToken}`,
      };
    }
  }

  if (!session.address) return { ok: false, code: "ADDRESS_MISSING" };
  if (!session.shippingOptionId) return { ok: false, code: "SHIPPING_MISSING" };

  // Initiate payment via gateway
  const paymentGateway = getGateway(gateway);
  const cartSnapshot = session.cartSnapshot as Array<{ unitPrice: number; quantity: number }>;
  const subtotal = cartSnapshot.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = subtotal + (session.shippingCost ?? 0);

  const result = await paymentGateway.initiate({
    amount: total,
    currency: "CLP",
    orderId: sessionId,
    returnUrl: "/checkout/resultado",
  });

  // Update session status to payment_pending
  await db
    .update(checkoutSessions)
    .set({
      status: "payment_pending",
      updatedAt: new Date(),
    } as Record<string, unknown>)
    .where(eq(checkoutSessions.id, sessionId));

  return {
    ok: true,
    token: result.token,
    redirectUrl: result.redirectUrl,
  };
}
