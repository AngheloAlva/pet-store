/**
 * Public tracking action — F3.3 Phase 7
 * getShipmentByTrackingNumber: public query (no auth required).
 * Returns shipment + tracking_events ordered by timestamp ascending.
 */
import { db } from "@/db";
import { shipments, trackingEvents, type CarrierId, type ShipmentStatus } from "@/db/schema";
import { eq } from "drizzle-orm";

type AnyDb = typeof db;

export interface TrackingResult {
  shipment: {
    id: string;
    orderId: string;
    carrier: CarrierId;
    status: ShipmentStatus;
    trackingNumber: string | null;
  };
  events: Array<{
    id: string;
    shipmentId: string;
    status: ShipmentStatus;
    description: string;
    timestamp: Date;
  }>;
}

export async function getShipmentByTrackingNumberWithDb(
  database: AnyDb,
  trackingNumber: string,
): Promise<TrackingResult | null> {
  const shipmentRows = await database
    .select()
    .from(shipments)
    .where(eq(shipments.trackingNumber, trackingNumber));

  if (shipmentRows.length === 0) return null;

  const shipment = shipmentRows[0];

  const events = await database
    .select()
    .from(trackingEvents)
    .where(eq(trackingEvents.shipmentId, shipment.id));

  // Sort ascending by timestamp (oldest first — PT-2a)
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    shipment: {
      id: shipment.id,
      orderId: shipment.orderId,
      carrier: shipment.carrier as CarrierId,
      status: shipment.status as ShipmentStatus,
      trackingNumber: shipment.trackingNumber,
    },
    events: events.map((e) => ({
      id: e.id,
      shipmentId: e.shipmentId,
      status: e.status as ShipmentStatus,
      description: e.description,
      timestamp: e.timestamp,
    })),
  };
}

export async function getShipmentByTrackingNumber(
  trackingNumber: string,
): Promise<TrackingResult | null> {
  return getShipmentByTrackingNumberWithDb(db, trackingNumber);
}
