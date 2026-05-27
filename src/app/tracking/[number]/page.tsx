/**
 * /tracking/[number] — F3.3 Phase 7
 * Public RSC page: unauthenticated timeline for a shipment by tracking number.
 * Next.js 16: params is Promise<{ number: string }> — must await.
 */
import { notFound } from "next/navigation";
import { getShipmentByTrackingNumber } from "@/app/actions/tracking";
import type { ShipmentStatus } from "@/lib/shipping/types";

interface TrackingPageProps {
  params: Promise<{ number: string }>;
}

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  preparando: "Preparando",
  en_ruta: "En ruta",
  entregado: "Entregado",
  fallido: "Fallido",
  listo: "Listo para retiro",
};

const CARRIER_LABELS: Record<string, string> = {
  propio: "Despacho propio",
  mock_chilexpress: "Chilexpress (demo)",
  mock_starken: "Starken (demo)",
  pickup: "Retiro en tienda",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { number } = await params;

  const result = await getShipmentByTrackingNumber(number);

  if (!result) notFound();

  const { shipment, events } = result;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguimiento de envío</h1>
          <p className="text-sm text-gray-500 font-mono mt-1">{number}</p>
        </div>

        {/* Shipment summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Transportista</span>
            <span className="font-medium text-gray-900">
              {CARRIER_LABELS[shipment.carrier] ?? shipment.carrier}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Estado actual</span>
            <span
              className={`font-medium ${
                shipment.status === "entregado"
                  ? "text-green-700"
                  : shipment.status === "fallido"
                  ? "text-red-700"
                  : shipment.status === "en_ruta"
                  ? "text-blue-700"
                  : shipment.status === "listo"
                  ? "text-purple-700"
                  : "text-yellow-700"
              }`}
            >
              {STATUS_LABELS[shipment.status] ?? shipment.status}
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
        </div>

        {/* Timeline (PT-2a: oldest first; latest event visually distinguished) */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Historial</h2>

          {events.length === 0 ? (
            <p className="text-sm text-gray-400">Sin eventos registrados aún.</p>
          ) : (
            <ol className="relative border-l border-gray-200 space-y-6 ml-3">
              {events.map((event, idx) => {
                const isLatest = idx === events.length - 1;
                return (
                  <li key={event.id} className="ml-6">
                    <span
                      className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${
                        isLatest ? "bg-indigo-600" : "bg-gray-300"
                      }`}
                    />
                    <div
                      className={`p-3 rounded-lg border ${
                        isLatest ? "border-indigo-200 bg-indigo-50" : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          isLatest ? "text-indigo-900" : "text-gray-700"
                        }`}
                      >
                        {STATUS_LABELS[event.status] ?? event.status}
                        {isLatest && (
                          <span className="ml-2 text-xs font-normal text-indigo-600">
                            · más reciente
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>
                      <time className="text-xs text-gray-400 mt-1 block">
                        {formatDate(event.timestamp)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
