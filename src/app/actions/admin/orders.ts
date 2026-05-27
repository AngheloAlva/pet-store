"use server";

/**
 * Admin orders actions — F3.2b
 * listOrders: returns all orders sorted by createdAt DESC, no dataUrl.
 * getOrderDetail: returns order + joined receipt with dataUrl for pending orders.
 * confirmTransfer: admin action to verify a bank transfer and trigger finalizeOrder.
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import {
  orders,
  orderItems,
  transferReceipts,
  users,
  checkoutSessions,
  type CarrierId,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { finalizeOrder, type CartLine } from "@/lib/checkout/finalize-order";
import { revalidatePath } from "next/cache";

type AnyDb = typeof db;

export type ConfirmTransferResult =
  | { ok: true; orderNumber: string }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "FORBIDDEN" | "ORDER_NOT_FOUND" | "ALREADY_PAID" | "OUT_OF_STOCK";
      message?: string;
    };

interface AdminContext {
  adminId: string;
  adminEmail: string;
  adminName: string;
}

// ---------------------------------------------------------------------------
// listOrders — returns all orders sorted newest first, NO dataUrl in result
// ---------------------------------------------------------------------------

export type OrderListItem = {
  id: string;
  orderNumber: string;
  userId: string;
  paymentStatus: string;
  paymentGateway: string;
  total: number;
  createdAt: Date;
  customerName: string;
};

export async function listOrdersWithDb(database: AnyDb): Promise<OrderListItem[]> {
  const rows = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      paymentStatus: orders.paymentStatus,
      paymentGateway: orders.paymentGateway,
      total: orders.total,
      createdAt: orders.createdAt,
      customerName: users.name,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    userId: r.userId,
    paymentStatus: r.paymentStatus,
    paymentGateway: r.paymentGateway,
    total: r.total,
    createdAt: r.createdAt,
    customerName: r.customerName ?? "Unknown",
  }));
}

export async function listOrders(): Promise<OrderListItem[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];

  return listOrdersWithDb(db);
}

// ---------------------------------------------------------------------------
// getOrderDetail — returns order + receipt (with dataUrl) for pending orders
// ---------------------------------------------------------------------------

export interface OrderDetailResult {
  order: {
    id: string;
    orderNumber: string;
    userId: string;
    paymentStatus: string;
    paymentGateway: string;
    total: number;
    subtotal: number;
    shippingCost: number;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    variantId: string | null;
    productId: string;
    sku: string;
  }>;
  receipt: {
    id: string;
    dataUrl: string;
    bankReference: string;
    uploadedAt: Date;
  } | null;
}

export async function getOrderDetailWithDb(
  database: AnyDb,
  orderId: string,
): Promise<OrderDetailResult | null> {
  const orderRows = await database
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  if (orderRows.length === 0) return null;

  const order = orderRows[0];

  const items = await database
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  let receipt: OrderDetailResult["receipt"] = null;
  if (order.paymentStatus === "pending_verification") {
    const receiptRows = await database
      .select()
      .from(transferReceipts)
      .where(eq(transferReceipts.orderId, orderId));

    if (receiptRows.length > 0) {
      receipt = {
        id: receiptRows[0].id,
        dataUrl: receiptRows[0].dataUrl,
        bankReference: receiptRows[0].bankReference,
        uploadedAt: receiptRows[0].uploadedAt,
      };
    }
  }

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      paymentStatus: order.paymentStatus,
      paymentGateway: order.paymentGateway,
      total: order.total,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
    },
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      variantId: i.variantId,
      productId: i.productId,
      sku: i.sku,
    })),
    receipt,
  };
}

export async function getOrderDetail(orderId: string): Promise<OrderDetailResult | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

  return getOrderDetailWithDb(db, orderId);
}

// ---------------------------------------------------------------------------
// confirmTransfer — admin verifies a bank transfer and finalizes the order
// ---------------------------------------------------------------------------

export async function confirmTransferWithDb(
  database: AnyDb,
  orderId: string,
  adminCtx: AdminContext,
): Promise<ConfirmTransferResult> {
  // Auth: only admins can confirm transfers
  // We use the injected adminCtx for testability — public action validates via getCurrentUser
  const adminUser = await database
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, adminCtx.adminId));

  if (adminUser.length === 0 || adminUser[0].role !== "admin") {
    return { ok: false, code: "FORBIDDEN" };
  }

  // Load order
  const orderRows = await database
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  if (orderRows.length === 0) return { ok: false, code: "ORDER_NOT_FOUND" };

  const order = orderRows[0];

  if (order.paymentStatus === "paid") {
    return { ok: false, code: "ALREADY_PAID" };
  }

  if (order.paymentStatus !== "pending_verification") {
    return { ok: false, code: "ORDER_NOT_FOUND" };
  }

  // Load order items (needed for finalizeOrder context)
  const items = await database
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  // Load customer info
  const customerRows = await database
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, order.userId));

  const customer = customerRows[0] ?? { email: "unknown@test.cl", name: "Unknown" };

  // Load checkout session for delivery fields (F3.3)
  const sessionRows = await database
    .select({
      deliveryType: checkoutSessions.deliveryType,
      shippingOptionId: checkoutSessions.shippingOptionId,
      dispatchSlot: checkoutSessions.dispatchSlot,
      pickupStoreId: checkoutSessions.pickupStoreId,
    })
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, order.checkoutSessionId));

  const session = sessionRows[0] ?? null;

  const cartSnapshot: CartLine[] = items.map((i) => ({
    variantId: i.variantId ?? "",
    productId: i.productId,
    sku: i.sku,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineTotal: i.lineTotal,
  }));

  try {
    await database.transaction(async (tx) => {
      // 1. Flip paymentStatus to paid
      await tx
        .update(orders)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      // 2. Calculate pointsEarned based on total
      const pointsEarned = Math.floor(order.total / 100);

      // 3. Update pointsEarned on the order row
      await tx
        .update(orders)
        .set({ pointsEarned, updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      // 4. Run all post-payment side effects (including shipment creation in step 7)
      await finalizeOrder(tx as never, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        userEmail: customer.email,
        userName: customer.name,
        cartSnapshot,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        total: order.total,
        shippingAddress: (order.address ?? {}) as Record<string, string>,
        paymentMethodLabel: "Transferencia bancaria (Demo)",
        pointsEarned,
        carrier: (session?.shippingOptionId ?? order.shippingOptionId) as CarrierId | null,
        deliveryType: session?.deliveryType as "despacho" | "pickup" | "courier" | null,
        dispatchSlot: session?.dispatchSlot ?? null,
        pickupStoreId: session?.pickupStoreId ?? null,
        regionKey: null,
      });
    });
  } catch (err) {
    const e = err as { code?: string; productName?: string };
    if (e.code === "OUT_OF_STOCK") {
      return { ok: false, code: "OUT_OF_STOCK", message: `Out of stock: ${e.productName}` };
    }
    throw err;
  }

  return { ok: true, orderNumber: order.orderNumber };
}

export async function confirmTransfer(orderId: string): Promise<ConfirmTransferResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN" };

  const result = await confirmTransferWithDb(db, orderId, {
    adminId: user.id,
    adminEmail: user.email,
    adminName: user.name,
  });

  if (result.ok) {
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
  }

  return result;
}
