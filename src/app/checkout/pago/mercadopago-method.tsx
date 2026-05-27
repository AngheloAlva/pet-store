"use client";

import { MERCADOPAGO_INSTALLMENTS, perInstallmentCLP } from "@/lib/payments/mercadopago-mock";

interface MercadoPagoMethodProps {
  total: number;
  installments: number;
  setInstallments: (n: number) => void;
  onPay: (token: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function MercadoPagoMethod({
  total,
  installments,
  setInstallments,
  onPay,
  loading = false,
  error,
}: MercadoPagoMethodProps) {
  const perInstallment = perInstallmentCLP(total, installments);

  function handlePay() {
    // Demo: always approve (no REJECT_TEST sentinel for MP in basic demo mode)
    onPay("mp-demo-approved");
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">MP</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">MercadoPago (Demo)</p>
          <p className="text-xs text-gray-500">Pago en cuotas sin interés</p>
        </div>
      </div>

      {/* Installment selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad de cuotas
        </label>
        <div className="grid grid-cols-4 gap-2">
          {MERCADOPAGO_INSTALLMENTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setInstallments(n)}
              className={`py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                installments === n
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {n}x
            </button>
          ))}
        </div>
      </div>

      {/* Per-installment display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">
          {installments} cuota{installments > 1 ? "s" : ""} de{" "}
          <span className="font-semibold text-gray-900">
            {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(
              perInstallment,
            )}
          </span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Total: {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(total)}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
      >
        {loading ? "Procesando..." : "Pagar con MercadoPago"}
      </button>
    </div>
  );
}
