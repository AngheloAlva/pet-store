"use server";

import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import {
  checkoutSessions,
  orders,
  orderItems,
  pointsConfig,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { confirmOrderSchema } from "./confirm-order.schema";
import { getGateway } from "@/lib/payments/registry";
import { generateOrderNumber, todayDate } from "@/lib/checkout/order-number";
import { findCompletedOrder } from "@/lib/checkout/idempotency";
import { finalizeOrder } from "@/lib/checkout/finalize-order";

export type ConfirmOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; code: "UNAUTHENTICATED" | "SESSION_NOT_FOUND" | "SESSION_EXPIRED" | "SESSION_NOT_PENDING" | "PAYMENT_REJECTED" | "OUT_OF_STOCK" | "VALIDATION_ERROR"; message?: string; productName?: string };

// Internal interface for the db-injected version (used in tests)
interface ConfirmOrderInternalInput {
  sessionId: string;
  gatewayToken: string;
  userId: string;
  userEmail: string;
  userName: string;
}

type AnyDb = typeof db;

/**
 * Core logic extracted so tests can inject a real PGlite db.
 */
export async function confirmOrderWithDb(
  database: AnyDb,
  input: ConfirmOrderInternalInput,
): Promise<ConfirmOrderResult> {
  const { sessionId, gatewayToken, userId, userEmail, userName } = input;

  // Load session
  const sessionRows = await database
    .select()
    .from(checkoutSessions)
    .where(and(eq(checkoutSessions.id, sessionId), eq(checkoutSessions.userId, userId)));

  if (sessionRows.length === 0) return { ok: false, code: "SESSION_NOT_FOUND" };

  const session = sessionRows[0];

  // TTL check
  if (session.expiresAt <= new Date()) return { ok: false, code: "SESSION_EXPIRED" };
  if (session.status === "expired") return { ok: false, code: "SESSION_EXPIRED" };

  // Idempotency: already completed
  if (session.status === "completed") {
    const existing = await findCompletedOrder(database as never, sessionId);
    if (existing) {
      return { ok: true, orderNumber: existing.orderNumber };
    }
  }

  // Must be payment_pending to proceed
  if (session.status !== "payment_pending") {
    return { ok: false, code: "SESSION_NOT_PENDING" };
  }

  // Resolve gateway from session (set at initiate time) — tamper-safe
  let gateway;
  try {
    gateway = getGateway(session.paymentGateway ?? "webpay_mock");
  } catch {
    return { ok: false, code: "VALIDATION_ERROR", message: "unknown payment gateway" };
  }

  // Verify payment via registry dispatch
  const paymentResult = await gateway.verify(gatewayToken);

  if (!paymentResult.approved) {
    return { ok: false, code: "PAYMENT_REJECTED" };
  }

  const cartSnapshot = session.cartSnapshot as Array<{
    variantId: string;
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;

  const subtotal = cartSnapshot.reduce((s, l) => s + l.lineTotal, 0);
  const shippingCost = session.shippingCost ?? 0;
  const total = subtotal + shippingCost;

  // Run the full transaction
  let orderNumber: string;

  await database.transaction(async (tx) => {
    // 1. Generate order number
    const today = todayDate();
    orderNumber = await generateOrderNumber(today, tx as never);

    // 2. Load points config
    const configRows = await tx.select().from(pointsConfig).where(eq(pointsConfig.id, "singleton"));
    const earnRate = configRows[0]?.earnRatePerCLP ?? 100;
    const pointsEarned = Math.floor(total / earnRate);

    // 3. Create order — read paymentGateway from session, not hardcoded
    const orderId = crypto.randomUUID();
    await tx.insert(orders).values({
      id: orderId,
      orderNumber: orderNumber!,
      userId,
      checkoutSessionId: sessionId,
      status: "confirmed",
      paymentStatus: "paid",
      paymentGateway: session.paymentGateway ?? "webpay_mock",
      paymentMetadata: session.paymentMetadata as Record<string, unknown> ?? null,
      gatewayToken,
      address: (session.address ?? {}) as Record<string, unknown>,
      shippingOptionId: session.shippingOptionId ?? "standard",
      shippingCost,
      subtotal,
      discountTotal: 0,
      walletDiscount: 0,
      total,
      pointsRedeemed: 0,
      pointsEarned,
    });

    // 4. Create order items
    for (const line of cartSnapshot) {
      await tx.insert(orderItems).values({
        id: crypto.randomUUID(),
        orderId,
        productId: line.productId,
        variantId: line.variantId,
        sku: line.sku,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      });
    }

    // 5. Update session status to completed
    await tx
      .update(checkoutSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(checkoutSessions.id, sessionId));

    // 6. Run all post-payment side effects via finalizeOrder (includes shipment creation in step 7)
    await finalizeOrder(tx as never, {
      orderId,
      orderNumber: orderNumber!,
      userId,
      userEmail,
      userName,
      cartSnapshot,
      subtotal,
      shippingCost,
      total,
      shippingAddress: (session.address ?? {}) as Record<string, string>,
      paymentMethodLabel: gateway.name,
      pointsEarned,
      carrier: session.shippingOptionId as import("@/db/schema").CarrierId | null,
      deliveryType: session.deliveryType as "despacho" | "pickup" | "courier" | null,
      dispatchSlot: session.dispatchSlot ?? null,
      pickupStoreId: session.pickupStoreId ?? null,
      regionKey: null,
    });
  });

  // T-26: subscription seam — best-effort, non-throwing
  // If the session carried a subscription intent, create the subscription AFTER
  // the order tx commits (design seam: does not roll back on failure).
  const intent = session.subscriptionIntent as {
    variantId: string;
    productId: string;
    frequencyDays: number;
    discountPercent: number;
  } | null | undefined;

  if (intent && intent.productId && intent.variantId) {
    try {
      const { createSubscriptionWithDb } = await import(
        "@/app/actions/cuenta/suscripciones"
      );
      await createSubscriptionWithDb(database, {
        userId,
        productId: intent.productId,
        variantId: intent.variantId,
        frequencyDays: intent.frequencyDays,
        discountPercent: intent.discountPercent,
      });
    } catch {
      // Best-effort: log and continue — subscription failure does not fail the order
      console.warn("[confirm-order] subscription creation failed (non-fatal)");
    }
  }

  return { ok: true, orderNumber: orderNumber! };
}

/**
 * Public server action — wraps confirmOrderWithDb with auth and validation.
 */
export async function confirmOrder(input: unknown): Promise<ConfirmOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = confirmOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  try {
    return await confirmOrderWithDb(db, {
      sessionId: parsed.data.sessionId,
      gatewayToken: parsed.data.gatewayToken,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
    });
  } catch (err) {
    const e = err as { code?: string; productName?: string };
    if (e.code === "OUT_OF_STOCK") {
      return { ok: false, code: "OUT_OF_STOCK", productName: e.productName };
    }
    throw err;
  }
}
