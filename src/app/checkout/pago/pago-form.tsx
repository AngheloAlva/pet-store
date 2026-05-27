"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initiatePayment } from "@/app/actions/checkout/initiate-payment";
import { getAllGateways } from "@/lib/payments/registry";
import { WebpayMethod } from "./webpay-method";
import { MercadoPagoMethod } from "./mercadopago-method";
import { TransferMethod } from "./transfer-method";

interface PagoFormProps {
  sessionId: string;
  total: number;
}

const gateways = getAllGateways();

export function PagoForm({ sessionId, total }: PagoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>(gateways[0]?.gatewayId ?? "webpay_mock");
  const [installments, setInstallments] = useState(1);

  async function handlePay(gatewayToken: string) {
    setError(null);
    setLoading(true);

    const result = await initiatePayment({
      sessionId,
      gateway: selectedMethod,
      installments: selectedMethod === "mercadopago_mock" ? installments : undefined,
    });

    setLoading(false);

    if (!result.ok) {
      if (result.code === "SESSION_EXPIRED") {
        setError("Tu sesión expiró. Por favor vuelve al carrito.");
      } else {
        setError("Error al iniciar el pago. Por favor intenta nuevamente.");
      }
      return;
    }

    router.push(`/checkout/resultado?paymentId=${sessionId}&token=${gatewayToken}`);
  }

  return (
    <div className="space-y-4">
      {/* Method Selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Selecciona tu método de pago</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {gateways.map((gateway) => (
            <button
              key={gateway.gatewayId}
              type="button"
              onClick={() => {
                setSelectedMethod(gateway.gatewayId);
                setError(null);
              }}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                selectedMethod === gateway.gatewayId
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold ${
                  gateway.gatewayId === "webpay_mock"
                    ? "bg-blue-600"
                    : gateway.gatewayId === "mercadopago_mock"
                    ? "bg-sky-500"
                    : "bg-emerald-600"
                }`}
              >
                {gateway.gatewayId === "webpay_mock"
                  ? "WP"
                  : gateway.gatewayId === "mercadopago_mock"
                  ? "MP"
                  : "TR"}
              </div>
              <span className="text-sm font-medium text-gray-900">{gateway.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Per-method inline UI */}
      {selectedMethod === "webpay_mock" && (
        <WebpayMethod onPay={handlePay} loading={loading} error={error} />
      )}
      {selectedMethod === "mercadopago_mock" && (
        <MercadoPagoMethod
          total={total}
          installments={installments}
          setInstallments={setInstallments}
          onPay={handlePay}
          loading={loading}
          error={error}
        />
      )}
      {selectedMethod === "transfer_mock" && (
        <TransferMethod
          sessionId={sessionId}
          bankReference={`REF-${sessionId.slice(0, 8).toUpperCase()}`}
          amount={total}
        />
      )}
    </div>
  );
}
