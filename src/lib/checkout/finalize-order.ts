/**
 * finalizeOrder — F3.2b / F3.3
 * Extracted from confirm-order.ts. Encapsulates all post-payment side effects:
 * stock validation, DTE issuance, dte_documents insert, points accrual,
 * confirmation email, and shipment creation (step 7).
 *
 * Caller is responsible for:
 * - Owning the transaction (tx)
 * - Pre-inserting the order row before calling this function
 * - Building FinalizeOrderContext from session/order data
 *
 * Spec invariant I-1: this is the ONLY function that inserts
 * dte_documents, points_transactions(purchase), and demo_emails(order_confirmation).
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  dteDocuments,
  pointsTransactions,
  demoEmails,
  orders as ordersTable,
  type CarrierId,
  type DeliveryType,
} from "@/db/schema";
import { validateStock } from "@/lib/checkout/stock-validator";
import { mockDTEProvider } from "@/lib/dte/mock";
import { TEMPLATES } from "@/lib/notifications/templates/index";
import { createShipment } from "@/lib/shipping/create-shipment";
import type { ShipmentMetadata } from "@/lib/shipping/types";
import { getCarrier } from "@/lib/carriers/index";

export interface CartLine {
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface FinalizeOrderContext {
  orderId: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  cartSnapshot: CartLine[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress: Record<string, string>;
  paymentMethodLabel: string;
  pointsEarned: number;
  // F3.3 — shipment fields (optional; defaults to 'propio' when absent for backward compat)
  carrier?: CarrierId | null;
  deliveryType?: DeliveryType | null;
  dispatchSlot?: string | null;
  pickupStoreId?: string | null;
  regionKey?: string | null;
}

type AnyDb = typeof db;

/**
 * Runs all post-payment side effects inside the caller-owned transaction.
 * Returns the issued dteId.
 */
export async function finalizeOrder(
  tx: AnyDb,
  ctx: FinalizeOrderContext,
): Promise<{ dteId: string }> {
  const {
    orderId,
    orderNumber,
    userId,
    userEmail,
    userName,
    cartSnapshot,
    subtotal,
    shippingCost,
    total,
    shippingAddress,
    paymentMethodLabel,
    pointsEarned,
    carrier,
    deliveryType,
    dispatchSlot,
    pickupStoreId,
    regionKey,
  } = ctx;

  // 1. Validate stock (live query inside tx)
  if (cartSnapshot.length > 0) {
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
  }

  // 2. Issue DTE
  const dteResult = await mockDTEProvider.issue({ id: orderId, documentType: "boleta" });
  const dteId = dteResult.dteId;

  // 3. Update order with dteId
  await tx
    .update(ordersTable)
    .set({ dteId, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));

  // 4. Create dte_documents row
  await tx.insert(dteDocuments).values({
    id: crypto.randomUUID(),
    orderId,
    dteId,
    status: "emitido",
    issuedAt: new Date(),
  });

  // 5. Record points earned
  if (pointsEarned > 0) {
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

  // 6. Enqueue order confirmation email
  const rendered = TEMPLATES.order_confirmation({
    orderNumber,
    customerName: userName,
    items: cartSnapshot.map((l) => ({ name: l.name, qty: l.quantity, lineTotal: l.lineTotal })),
    subtotal,
    shippingCost,
    discount: 0,
    total,
    shippingAddress,
    dteId,
    paymentMethodLabel,
  });

  await tx.insert(demoEmails).values({
    id: crypto.randomUUID(),
    toEmail: userEmail,
    toUserId: userId,
    subject: rendered.subject,
    type: "order_confirmation",
    bodyHtml: rendered.html,
    bodyText: rendered.text,
    data: { orderNumber } as Record<string, unknown>,
  });

  // 7. Create shipment (F3.3) — idempotent via try/catch unique-violation
  const resolvedCarrier: CarrierId = carrier ?? "propio";
  const resolvedDeliveryType = deliveryType ?? "despacho";

  // Build carrier-specific metadata
  let shipmentMetadata: ShipmentMetadata;
  if (resolvedDeliveryType === "pickup" || resolvedCarrier === "pickup") {
    shipmentMetadata = { carrier: "pickup", storeId: pickupStoreId ?? "" };
  } else if (resolvedCarrier === "mock_chilexpress") {
    shipmentMetadata = { carrier: "mock_chilexpress", regionKey: regionKey ?? "RM" };
  } else if (resolvedCarrier === "mock_starken") {
    shipmentMetadata = { carrier: "mock_starken", regionKey: regionKey ?? "RM" };
  } else {
    // propio — default
    shipmentMetadata = { carrier: "propio", slot: (dispatchSlot as "manana" | "tarde") ?? "tarde" };
  }

  // Generate tracking number if the carrier supports it
  let trackingNumber: string | undefined;
  try {
    const carrierImpl = getCarrier(resolvedCarrier);
    if (carrierImpl.generateTrackingNumber) {
      trackingNumber = carrierImpl.generateTrackingNumber();
    }
  } catch {
    // carrier not registered in test context — skip tracking number
  }

  await createShipment(tx, {
    orderId,
    carrier: resolvedCarrier,
    metadata: shipmentMetadata,
    trackingNumber,
  });

  return { dteId };
}
