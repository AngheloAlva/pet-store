"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initiatePayment } from "@/app/actions/checkout/initiate-payment";

interface PagoFormProps {
  sessionId: string;
}

export function PagoForm({ sessionId }: PagoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState<"approve" | "reject">("approve");

  async function handlePay() {
    setError(null);
    setLoading(true);

    const result = await initiatePayment({ sessionId, gateway: "webpay_mock" });

    setLoading(false);

    if (!result.ok) {
      if (result.code === "SESSION_EXPIRED") {
        setError("Tu sesión expiró. Por favor vuelve al carrito.");
      } else {
        setError("Error al iniciar el pago. Por favor intenta nuevamente.");
      }
      return;
    }

    // For mock gateway: navigate directly to resultado with the chosen token
    const token = mockMode === "reject" ? "REJECT_TEST" : "approve";
    router.push(`/checkout/resultado?paymentId=${result.token}&token=${token}`);
  }

  return (
    <div className="space-y-6">
      {/* Webpay mock UI */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">WP</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">Webpay (Demo)</p>
            <p className="text-xs text-gray-500">Simulación de pago con tarjeta</p>
          </div>
        </div>

        {/* Mock approve/reject toggle */}
        <div className="mb-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
          <p className="text-xs font-medium text-yellow-800 mb-2">Modo demo — simular resultado:</p>
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mockMode"
                value="approve"
                checked={mockMode === "approve"}
                onChange={() => setMockMode("approve")}
                className="text-green-600"
              />
              <span className="text-sm text-yellow-800">Aprobar pago</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mockMode"
                value="reject"
                checked={mockMode === "reject"}
                onChange={() => setMockMode("reject")}
                className="text-red-600"
              />
              <span className="text-sm text-yellow-800">Rechazar pago</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
        >
          {loading ? "Procesando..." : "Pagar con Webpay"}
        </button>
      </div>
    </div>
  );
}
