/**
 * Shipping domain barrel — F3.3
 */
export type { CarrierId, ShipmentStatus, ShipmentMetadata, Shipment, TrackingEvent } from "./types";
export { CARRIER_IDS, SHIPMENT_STATUSES } from "./types";
export { TRANSITIONS, canTransition } from "./transitions";
export { requiresAddress } from "./requires-address";
export { createShipment } from "./create-shipment";
export type { CreateShipmentContext } from "./create-shipment";
