"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { selectShipping } from "@/app/actions/checkout/select-shipping";
import type { ShippingOption } from "@/lib/checkout/shipping";

interface EnvioFormProps {
  sessionId: string;
  options: readonly ShippingOption[];
  selectedOptionId: string | null;
}

export function EnvioForm({ sessionId, options, selectedOptionId }: EnvioFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(selectedOptionId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;

    setError(null);
    setSubmitting(true);

    const result = await selectShipping({ sessionId, shippingOptionId: selected });

    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "SESSION_EXPIRED") {
        setError("Tu sesión expiró. Por favor vuelve al carrito.");
      } else {
        setError("Error al seleccionar envío. Por favor intenta nuevamente.");
      }
      return;
    }

    router.push("/checkout/resumen");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {options.map((option) => (
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
            name="shippingOption"
            value={option.id}
            checked={selected === option.id}
            onChange={() => setSelected(option.id)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{option.label}</span>
              <span className="font-semibold text-gray-900">
                ${option.cost.toLocaleString("es-CL")}
              </span>
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
        {submitting ? "Guardando..." : "Continuar al resumen"}
      </button>
    </form>
  );
}
