"use server";

/**
 * submitTransferReceipt — F3.2b
 * Server action for the transfer payment rail.
 * Creates an order with paymentStatus="pending_verification" and stores
 * the base64 receipt image. Does NOT call finalizeOrder (spec invariant I-2).
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import {
  checkoutSessions,
  orders,
  orderItems,
  transferReceipts,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  submitTransferReceiptSchema,
  type SubmitTransferReceiptResult,
} from "./submit-transfer-receipt.schema";
import { generateOrderNumber, todayDate } from "@/lib/checkout/order-number";

interface SubmitTransferReceiptInternalInput {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  dataUrl: string;
  bankReference: string;
}

type AnyDb = typeof db;

/**
 * Core logic — accepts injected db for testing.
 * Input is expected to already have dataUrl and bankReference validated by caller.
 * For testing, use raw values directly; the public action validates first.
 */
export async function submitTransferReceiptWithDb(
  database: AnyDb,
  input: SubmitTransferReceiptInternalInput,
): Promise<SubmitTransferReceiptResult> {
  const { sessionId, userId, dataUrl, bankReference } = input;

  // Validate dataUrl and bankReference (these are user-supplied content)
  const contentParsed = submitTransferReceiptSchema.pick({ dataUrl: true, bankReference: true }).safeParse({
    dataUrl,
    bankReference,
  });

  if (!contentParsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: JSON.stringify(contentParsed.error.flatten()),
    };
  }

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

  // Must be payment_pending to proceed
  if (session.status !== "payment_pending") {
    return { ok: false, code: "SESSION_NOT_PENDING" };
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

  let orderNumber!: string;

  await database.transaction(async (tx) => {
    // 1. Generate order number
    const today = todayDate();
    orderNumber = await generateOrderNumber(today, tx as never);

    // 2. Create order with pending_verification status — NOT paid
    const orderId = crypto.randomUUID();
    await tx.insert(orders).values({
      id: orderId,
      orderNumber,
      userId,
      checkoutSessionId: sessionId,
      status: "confirmed",
      paymentStatus: "pending_verification",
      paymentGateway: session.paymentGateway ?? "transfer_mock",
      paymentMetadata: session.paymentMetadata as Record<string, unknown> ?? null,
      address: (session.address ?? {}) as Record<string, unknown>,
      shippingOptionId: session.shippingOptionId ?? "standard",
      shippingCost,
      subtotal,
      discountTotal: 0,
      walletDiscount: 0,
      total,
      pointsRedeemed: 0,
      pointsEarned: 0, // Points are accrued only at finalizeOrder time
    });

    // 3. Create order items
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

    // 4. Store the transfer receipt (base64 image)
    await tx.insert(transferReceipts).values({
      id: crypto.randomUUID(),
      orderId,
      dataUrl,
      bankReference,
    });

    // 5. Mark session as completed
    await tx
      .update(checkoutSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(checkoutSessions.id, sessionId));

    // NOTE: finalizeOrder is intentionally NOT called here.
    // Spec invariant I-2: pending_verification orders must NOT have DTE/points/stock/email.
    // These will be fired by confirmTransfer when the admin verifies the transfer.
  });

  return { ok: true, orderNumber };
}

/**
 * Public server action — wraps submitTransferReceiptWithDb with auth.
 */
export async function submitTransferReceipt(input: unknown): Promise<SubmitTransferReceiptResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const parsed = submitTransferReceiptSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: JSON.stringify(parsed.error.flatten()) };
  }

  return await submitTransferReceiptWithDb(db, {
    sessionId: parsed.data.sessionId,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    dataUrl: parsed.data.dataUrl,
    bankReference: parsed.data.bankReference,
  });
}
