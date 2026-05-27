"use client";

/**
 * ShipmentPanel — F3.3 Phase 6
 * Admin UI card showing shipment status, carrier, tracking number, and latest event.
 * Includes "Avanzar estado" button for allowed transitions.
 */
import { useState } from "react";
import { advanceShipmentStatus } from "@/app/actions/admin/shipments";
import { TRANSITIONS } from "@/lib/shipping/transitions";
import type { CarrierId, ShipmentStatus } from "@/lib/shipping/types";

interface ShipmentInfo {
  id: string;
  orderId: string;
  carrier: CarrierId;
  status: ShipmentStatus;
  trackingNumber: string | null;
}

interface TrackingEventInfo {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  description: string;
  timestamp: Date;
}

interface ShipmentPanelProps {
  shipment: ShipmentInfo;
  events: TrackingEventInfo[];
}

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  preparando: "Preparando",
  en_ruta: "En ruta",
  entregado: "Entregado",
  fallido: "Fallido",
  listo: "Listo para retiro",
};

const CARRIER_LABELS: Record<CarrierId, string> = {
  propio: "Despacho propio",
  mock_chilexpress: "Chilexpress (demo)",
  mock_starken: "Starken (demo)",
  pickup: "Retiro en tienda",
};

export function ShipmentPanel({ shipment, events }: ShipmentPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<ShipmentStatus>(shipment.status);

  // Compute allowed next statuses from transitions map
  const allowedNext = TRANSITIONS[shipment.carrier][currentStatus] ?? [];
  const isTerminal = allowedNext.length === 0;

  const latestEvent = events.at(-1);

  async function handleAdvance(nextStatus: ShipmentStatus) {
    setLoading(true);
    setError(null);
    try {
      const result = await advanceShipmentStatus(shipment.id, nextStatus);
      if (result.ok) {
        setCurrentStatus(result.newStatus);
      } else {
        setError(`Error: ${result.code}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Envío</h2>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Transportista</span>
          <span className="font-medium text-gray-900">
            {CARRIER_LABELS[shipment.carrier] ?? shipment.carrier}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Estado</span>
          <span
            className={`font-medium ${
              currentStatus === "entregado"
                ? "text-green-700"
                : currentStatus === "fallido"
                ? "text-red-700"
                : currentStatus === "en_ruta"
                ? "text-blue-700"
                : currentStatus === "listo"
                ? "text-purple-700"
                : "text-yellow-700"
            }`}
          >
            {STATUS_LABELS[currentStatus] ?? currentStatus}
          </span>
        </div>

        {shipment.trackingNumber && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Número de seguimiento</span>
            <span className="font-mono font-medium text-gray-900">
              {shipment.trackingNumber}
            </span>
          </div>
        )}

        {latestEvent && (
          <div className="text-sm text-gray-500 mt-2">
            <span className="font-medium text-gray-700">Último evento:</span>{" "}
            {latestEvent.description}
          </div>
        )}
      </div>

      {/* Advance state buttons */}
      {!isTerminal && (
        <div className="flex gap-2 flex-wrap">
          {allowedNext.map((nextStatus) => (
            <button
              key={nextStatus}
              onClick={() => handleAdvance(nextStatus)}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Avanzar: {STATUS_LABELS[nextStatus] ?? nextStatus}
            </button>
          ))}
        </div>
      )}

      {isTerminal && (
        <button
          disabled
          aria-label="Avanzar estado (no disponible)"
          className="px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-500 rounded-md cursor-not-allowed"
        >
          Estado final — sin avance posible
        </button>
      )}

      {loading && <p className="text-sm text-gray-500">Actualizando...</p>}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
