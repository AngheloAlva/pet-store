"use server";

import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { initiatePaymentSchema } from "./initiate-payment.schema";
import { getGateway } from "@/lib/payments/registry";
import { perInstallmentCLP } from "@/lib/payments/mercadopago-mock";
import type { PaymentMetadata } from "@/lib/payments/metadata";

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

  const { sessionId, gateway, installments } = parsed.data;

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

  // Compute paymentMetadata
  const paymentMetadata: PaymentMetadata =
    gateway === "mercadopago_mock"
      ? {
          kind: "mercadopago",
          installments: (installments ?? 1) as 1 | 3 | 6 | 12,
          installmentValue: perInstallmentCLP(total, installments ?? 1),
        }
      : { kind: "webpay" };

  // Update session status to payment_pending and persist gateway + metadata
  await db
    .update(checkoutSessions)
    .set({
      status: "payment_pending",
      paymentGateway: gateway,
      paymentMetadata: paymentMetadata as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(checkoutSessions.id, sessionId));

  return {
    ok: true,
    token: result.token,
    redirectUrl: result.redirectUrl,
  };
}
