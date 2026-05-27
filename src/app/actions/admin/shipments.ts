"use server";

/**
 * Admin shipments actions — F3.3 Phase 6
 * advanceShipmentStatus: validates transition, inserts tracking_events row, updates shipments.status.
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { shipments, trackingEvents, users, type CarrierId, type ShipmentStatus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canTransition } from "@/lib/shipping/transitions";
import { revalidatePath } from "next/cache";

type AnyDb = typeof db;

export type AdvanceShipmentStatusResult =
  | { ok: true; newStatus: ShipmentStatus }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "SHIPMENT_NOT_FOUND"
        | "INVALID_TRANSITION";
    };

// Status label map for tracking event descriptions
const STATUS_DESCRIPTIONS: Record<ShipmentStatus, string> = {
  preparando: "Pedido recibido y en preparación",
  en_ruta: "Pedido en camino",
  entregado: "Pedido entregado",
  fallido: "Entrega fallida",
  listo: "Pedido listo para retiro",
};

export async function advanceShipmentStatusWithDb(
  database: AnyDb,
  shipmentId: string,
  nextStatus: ShipmentStatus,
  adminUserId: string,
): Promise<AdvanceShipmentStatusResult> {
  // Check admin role
  const adminRows = await database
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, adminUserId));

  if (adminRows.length === 0 || adminRows[0].role !== "admin") {
    return { ok: false, code: "FORBIDDEN" };
  }

  // Load shipment
  const shipmentRows = await database
    .select({
      id: shipments.id,
      carrier: shipments.carrier,
      status: shipments.status,
    })
    .from(shipments)
    .where(eq(shipments.id, shipmentId));

  if (shipmentRows.length === 0) {
    return { ok: false, code: "SHIPMENT_NOT_FOUND" };
  }

  const shipment = shipmentRows[0];
  const currentStatus = shipment.status as ShipmentStatus;
  const carrier = shipment.carrier as CarrierId;

  // Validate transition
  if (!canTransition(carrier, currentStatus, nextStatus)) {
    return { ok: false, code: "INVALID_TRANSITION" };
  }

  // Update shipments.status and insert tracking_events
  await database
    .update(shipments)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(shipments.id, shipmentId));

  await database.insert(trackingEvents).values({
    id: crypto.randomUUID(),
    shipmentId,
    status: nextStatus,
    description: STATUS_DESCRIPTIONS[nextStatus] ?? nextStatus,
  });

  return { ok: true, newStatus: nextStatus };
}

export async function advanceShipmentStatus(
  shipmentId: string,
  nextStatus: ShipmentStatus,
): Promise<AdvanceShipmentStatusResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN" };

  const result = await advanceShipmentStatusWithDb(db, shipmentId, nextStatus, user.id);

  if (result.ok) {
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/pedidos/[id]", "page");
  }

  return result;
}
