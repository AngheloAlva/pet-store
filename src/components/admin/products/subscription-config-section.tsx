"use client";

/**
 * SubscriptionConfigSection — F3.5
 * Admin component for configuring subscription settings on a product.
 * Manages: subscriptionEnabled toggle, frequencies multiselect, discount select.
 */
import { useState } from "react";
import { toast } from "sonner";
import { updateSubscriptionConfig } from "@/app/actions/admin/subscriptions";

const ALLOWED_FREQUENCIES = [15, 30, 45, 60] as const;
const ALLOWED_DISCOUNTS = [0, 5, 10] as const;

interface SubscriptionInitial {
  subscriptionEnabled: boolean;
  subscriptionFrequencies: number[];
  subscriptionDiscountPercent: number;
}

interface Props {
  productId: string;
  initial: SubscriptionInitial;
}

export function SubscriptionConfigSection({ productId, initial }: Props) {
  const [enabled, setEnabled] = useState(initial.subscriptionEnabled);
  const [frequencies, setFrequencies] = useState<number[]>(initial.subscriptionFrequencies);
  const [discountPercent, setDiscountPercent] = useState<number>(initial.subscriptionDiscountPercent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFrequency(freq: number) {
    setFrequencies((prev) =>
      prev.includes(freq) ? prev.filter((f) => f !== freq) : [...prev, freq],
    );
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const result = await updateSubscriptionConfig({
        productId,
        subscriptionEnabled: enabled,
        subscriptionFrequencies: enabled ? frequencies : [],
        subscriptionDiscountPercent: enabled ? discountPercent : 0,
      });

      if (result.ok) {
        toast.success("Subscription config saved");
      } else {
        setError(`Error: ${result.code}${result.message ? ` — ${result.message}` : ""}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Subscription Settings</h3>

      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          role="checkbox"
          aria-label="Habilitar suscripciones"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm">Habilitar suscripciones para este producto</span>
      </label>

      {/* Frequencies multiselect */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Frecuencias disponibles (días)</p>
        <div className="flex gap-2">
          {ALLOWED_FREQUENCIES.map((freq) => (
            <button
              key={freq}
              type="button"
              onClick={() => toggleFrequency(freq)}
              disabled={!enabled}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                frequencies.includes(freq)
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {freq}
            </button>
          ))}
        </div>
      </div>

      {/* Discount selector */}
      <div className="space-y-2">
        <label htmlFor="subscription-discount" className="text-sm font-medium text-gray-700">
          Descuento para suscriptores (%)
        </label>
        <select
          id="subscription-discount"
          value={discountPercent}
          onChange={(e) => setDiscountPercent(Number(e.target.value))}
          disabled={!enabled}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
        >
          {ALLOWED_DISCOUNTS.map((d) => (
            <option key={d} value={d}>{d}%</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar configuración"}
      </button>
    </div>
  );
}
