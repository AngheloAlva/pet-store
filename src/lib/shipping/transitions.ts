/**
 * Shipment state machine — F3.3
 * Allowed transitions per carrier. Spanish statuses throughout.
 */
import type { CarrierId, ShipmentStatus } from "./types";

type TransitionMap = Record<ShipmentStatus, ShipmentStatus[]>;
type CarrierTransitions = Record<CarrierId, TransitionMap>;

// propio: preparando → en_ruta → entregado | fallido
const propioTransitions: TransitionMap = {
  preparando: ["en_ruta"],
  en_ruta: ["entregado", "fallido"],
  entregado: [],
  fallido: [],
  listo: ["entregado", "fallido"],
};

// mock couriers: same as propio
const mockCourierTransitions: TransitionMap = {
  preparando: ["en_ruta"],
  en_ruta: ["entregado", "fallido"],
  entregado: [],
  fallido: [],
  listo: [],
};

// pickup: preparando → listo → entregado | fallido
const pickupTransitions: TransitionMap = {
  preparando: ["listo"],
  en_ruta: [],
  listo: ["entregado", "fallido"],
  entregado: [],
  fallido: [],
};

export const TRANSITIONS: CarrierTransitions = {
  propio: propioTransitions,
  mock_chilexpress: mockCourierTransitions,
  mock_starken: mockCourierTransitions,
  pickup: pickupTransitions,
};

export function canTransition(
  carrier: CarrierId,
  from: ShipmentStatus,
  to: ShipmentStatus,
): boolean {
  const map = TRANSITIONS[carrier];
  if (!map) return false;
  const allowed = map[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
