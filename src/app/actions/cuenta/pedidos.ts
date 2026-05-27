"use server";

/**
 * Pedidos read actions — F3.4
 * Owner-scoped order list and detail with explicit joins.
 * NO ordersRelations used — explicit leftJoin mirrors getOrderDetailWithDb pattern.
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { orders, orderItems, shipments, products } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";

type AnyDb = typeof db;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface OrderListItem {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  paymentStatus: string;
  paymentGateway: string;
  total: number;
  createdAt: Date;
}

export interface OrderDetailResult {
  order: {
    id: string;
    orderNumber: string;
    userId: string;
    status: string;
    paymentStatus: string;
    paymentGateway: string;
    total: number;
    subtotal: number;
    shippingCost: number;
    address: unknown;
    createdAt: Date;
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
    slug: string | null;
  }>;
  shipment: {
    id: string;
    carrier: string;
    status: string;
    trackingNumber: string | null;
    metadata: unknown;
    createdAt: Date;
  } | null;
}

// ---------------------------------------------------------------------------
// listUserOrdersWithDb
// ---------------------------------------------------------------------------
export async function listUserOrdersWithDb(
  database: AnyDb,
  userId: string,
): Promise<OrderListItem[]> {
  const rows = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentGateway: orders.paymentGateway,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  return rows;
}

export async function getOwnOrders(): Promise<OrderListItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return listUserOrdersWithDb(db, user.id);
}

// ---------------------------------------------------------------------------
// getUserOrderDetailWithDb
// ---------------------------------------------------------------------------
export async function getUserOrderDetailWithDb(
  database: AnyDb,
  userId: string,
  orderNumber: string,
): Promise<OrderDetailResult | null> {
  // Fetch order with userId ownership filter
  const orderRows = await database
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)));

  if (orderRows.length === 0) return null;

  const order = orderRows[0];

  // Fetch items with product slug (left join to handle orphaned productIds gracefully)
  const items = await database
    .select({
      id: orderItems.id,
      name: orderItems.name,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      lineTotal: orderItems.lineTotal,
      variantId: orderItems.variantId,
      productId: orderItems.productId,
      sku: orderItems.sku,
      slug: products.slug,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, order.id));

  // Fetch shipment (leftJoin equivalent via separate query)
  const shipmentRows = await database
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, order.id));

  const shipment = shipmentRows.length > 0
    ? {
        id: shipmentRows[0].id,
        carrier: shipmentRows[0].carrier,
        status: shipmentRows[0].status,
        trackingNumber: shipmentRows[0].trackingNumber,
        metadata: shipmentRows[0].metadata,
        createdAt: shipmentRows[0].createdAt,
      }
    : null;

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentGateway: order.paymentGateway,
      total: order.total,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      address: order.address,
      createdAt: order.createdAt,
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
      slug: i.slug ?? null,
    })),
    shipment,
  };
}

export async function getOwnOrderDetail(
  orderNumber: string,
): Promise<OrderDetailResult | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const result = await getUserOrderDetailWithDb(db, user.id, orderNumber);
  return result;
}

export async function getOwnOrderDetailOrNotFound(
  orderNumber: string,
): Promise<OrderDetailResult> {
  const result = await getOwnOrderDetail(orderNumber);
  if (!result) notFound();
  return result;
}
