"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { selectDeliveryType } from "@/app/actions/checkout/select-delivery-type";

interface TipoEntregaFormProps {
  sessionId: string;
  currentDeliveryType?: string | null;
}

const DELIVERY_OPTIONS = [
  {
    id: "despacho" as const,
    label: "Despacho a domicilio",
    description: "Recibí tu pedido en casa",
    icon: "🏠",
  },
  {
    id: "pickup" as const,
    label: "Retiro en tienda",
    description: "Retirá gratis en la tienda de tu preferencia",
    icon: "🏪",
  },
  {
    id: "courier" as const,
    label: "Envío a regiones",
    description: "Despachamos con Chilexpress o Starken",
    icon: "📦",
  },
];

export function TipoEntregaForm({ sessionId, currentDeliveryType }: TipoEntregaFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentDeliveryType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;

    setError(null);
    setSubmitting(true);

    const result = await selectDeliveryType({ sessionId, deliveryType: selected as "despacho" | "pickup" | "courier" });

    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "SESSION_EXPIRED") {
        setError("Tu sesión expiró. Por favor volvé al carrito.");
      } else {
        setError("Error al seleccionar método. Por favor intentá nuevamente.");
      }
      return;
    }

    // Routing based on selected delivery type
    if (selected === "pickup") {
      router.push("/checkout/envio");
    } else {
      router.push("/checkout/entrega");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {DELIVERY_OPTIONS.map((option) => (
        <label
          key={option.id}
          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
            selected === option.id
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name="deliveryType"
            value={option.id}
            checked={selected === option.id}
            onChange={() => setSelected(option.id)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{option.icon}</span>
              <span className="font-medium text-gray-900">{option.label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
          </div>
        </label>
      ))}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <button
        type="submit"
        disabled={!selected || submitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
      >
        {submitting ? "Guardando..." : "Continuar"}
      </button>
    </form>
  );
}
