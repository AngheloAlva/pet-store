"use server";

import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import {
  checkoutSessions,
  orders,
  orderItems,
  dteDocuments,
  pointsTransactions,
  pointsConfig,
  demoEmails,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { confirmOrderSchema } from "./confirm-order.schema";
import { getGateway } from "@/lib/payments/registry";
import { mockDTEProvider } from "@/lib/dte/mock";
import { generateOrderNumber, todayDate } from "@/lib/checkout/order-number";
import { validateStock } from "@/lib/checkout/stock-validator";
import { findCompletedOrder } from "@/lib/checkout/idempotency";
import { TEMPLATES } from "@/lib/notifications/templates/index";

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
  let dteId: string;

  await database.transaction(async (tx) => {
    // 1. Validate stock (live query)
    const stockLines = cartSnapshot.map((l) => ({
      variantId: l.variantId,
      productName: l.name,
      quantity: l.quantity,
    }));

    const stockCheck = await validateStock(stockLines, tx as never);
    if (!stockCheck.ok) {
      throw Object.assign(new Error("OUT_OF_STOCK"), {
        code: "OUT_OF_STOCK",
        productName: stockCheck.productName,
      });
    }

    // 2. Generate order number
    const today = todayDate();
    orderNumber = await generateOrderNumber(today, tx as never);

    // 3. Load points config
    const configRows = await tx.select().from(pointsConfig).where(eq(pointsConfig.id, "singleton"));
    const earnRate = configRows[0]?.earnRatePerCLP ?? 100;
    const pointsEarned = Math.floor(total / earnRate);

    // 4. Create order — read paymentGateway from session, not hardcoded
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

    // 5. Create order items
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

    // 6. Stock decrement note:
    // stockLevels has no quantity column — it tracks status per store.
    // Full quantity tracking is out of scope for F3.1.
    // validateStock above already guards against oversell.

    // 7. Record points earned
    if (pointsEarned > 0) {
      // Get current balance
      const prevTxRows = await tx
        .select({ balanceAfter: pointsTransactions.balanceAfter })
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, userId));

      const currentBalance = prevTxRows.length > 0
        ? Math.max(...prevTxRows.map((r) => r.balanceAfter))
        : 0;

      await tx.insert(pointsTransactions).values({
        id: crypto.randomUUID(),
        userId,
        deltaPoints: pointsEarned,
        balanceAfter: currentBalance + pointsEarned,
        kind: "purchase",
        referenceId: orderId,
        description: `Puntos por orden ${orderNumber}`,
      });
    }

    // 8. Update session status to completed
    await tx
      .update(checkoutSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(checkoutSessions.id, sessionId));

    // 9. Issue DTE
    const dteResult = await mockDTEProvider.issue({ id: orderId, documentType: "boleta" });
    dteId = dteResult.dteId;

    // Update order with dteId
    await tx
      .update(orders)
      .set({ dteId: dteId!, updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    // 9b. Create dte_documents row (spec § 6)
    // Mock issues instantly so status is 'emitido' immediately.
    await tx.insert(dteDocuments).values({
      id: crypto.randomUUID(),
      orderId,
      dteId: dteId!,
      status: "emitido",
      issuedAt: new Date(),
    });

    // 10. Enqueue order confirmation email
    const rendered = TEMPLATES.order_confirmation({
      orderNumber: orderNumber!,
      customerName: userName,
      items: cartSnapshot.map((l) => ({ name: l.name, qty: l.quantity, lineTotal: l.lineTotal })),
      subtotal,
      shippingCost,
      discount: 0,
      total,
      shippingAddress: (session.address ?? {}) as Record<string, string>,
      dteId: dteId!,
      paymentMethodLabel: gateway.name,
    });

    await tx.insert(demoEmails).values({
      id: crypto.randomUUID(),
      toEmail: userEmail,
      toUserId: userId,
      subject: rendered.subject,
      type: "order_confirmation",
      bodyHtml: rendered.html,
      bodyText: rendered.text,
      data: { orderNumber: orderNumber! } as Record<string, unknown>,
    });
  });

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
