/**
 * Shipping domain types — F3.3
 * CarrierId, ShipmentStatus, ShipmentMetadata discriminated union, Shipment, TrackingEvent.
 */

export const CARRIER_IDS = ["propio", "mock_chilexpress", "mock_starken", "pickup"] as const;
export type CarrierId = (typeof CARRIER_IDS)[number];

export const SHIPMENT_STATUSES = [
  "preparando",
  "en_ruta",
  "entregado",
  "fallido",
  "listo",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

// Discriminated union per carrier
export type ShipmentMetadata =
  | { carrier: "propio"; slot: "manana" | "tarde" }
  | { carrier: "mock_chilexpress"; regionKey: string }
  | { carrier: "mock_starken"; regionKey: string }
  | { carrier: "pickup"; storeId: string };

export interface Shipment {
  id: string;
  orderId: string;
  carrier: CarrierId;
  status: ShipmentStatus;
  trackingNumber: string | null;
  metadata: ShipmentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  description: string;
  timestamp: Date;
}
