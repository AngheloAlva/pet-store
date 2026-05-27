/**
 * createShipment — F3.3
 * Idempotent shipment creation (try/catch unique-violation per PGlite convention).
 * Called as step 7 of finalizeOrder.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shipments, trackingEvents } from "@/db/schema";
import type { CarrierId, ShipmentMetadata } from "./types";

type AnyDb = typeof db;

export interface CreateShipmentContext {
  orderId: string;
  carrier: CarrierId;
  metadata: ShipmentMetadata;
  trackingNumber?: string;
}

export async function createShipment(
  tx: AnyDb,
  ctx: CreateShipmentContext,
): Promise<{ shipmentId: string }> {
  const { orderId, carrier, metadata, trackingNumber } = ctx;

  // Idempotency: check if shipment already exists
  const existing = await tx
    .select({ id: shipments.id })
    .from(shipments)
    .where(eq(shipments.orderId, orderId));

  if (existing.length > 0) {
    return { shipmentId: existing[0].id };
  }

  const shipmentId = crypto.randomUUID();

  try {
    await tx.insert(shipments).values({
      id: shipmentId,
      orderId,
      carrier,
      status: "preparando",
      trackingNumber: trackingNumber ?? null,
      metadata: metadata as Record<string, unknown>,
    });
  } catch (err) {
    // Unique-violation: another concurrent insert for the same orderId
    const maybeUnique =
      err instanceof Error &&
      (err.message.includes("unique") ||
        err.message.includes("duplicate") ||
        (err as { code?: string }).code === "23505");

    if (maybeUnique) {
      const retry = await tx
        .select({ id: shipments.id })
        .from(shipments)
        .where(eq(shipments.orderId, orderId));
      if (retry.length > 0) {
        return { shipmentId: retry[0].id };
      }
    }
    throw err;
  }

  // Insert initial tracking_events row
  await tx.insert(trackingEvents).values({
    id: crypto.randomUUID(),
    shipmentId,
    status: "preparando",
    description: "Pedido recibido y en preparación",
  });

  return { shipmentId };
}
