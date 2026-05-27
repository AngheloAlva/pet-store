"use client";

/**
 * CoberturaSettings — F3.3 Phase 6
 * Admin card for managing coveredCommunes, freeShippingThreshold, and dispatchSlots.
 */
import { useState } from "react";
import { updateCoberturaSettings } from "@/app/actions/admin/settings";

interface CoberturaSettingsProps {
  initialCommunes: string[];
  initialThreshold: number;
  initialSlots: string[];
}

export function CoberturaSettings({
  initialCommunes,
  initialThreshold,
  initialSlots,
}: CoberturaSettingsProps) {
  const [communes, setCommunes] = useState(initialCommunes.join("\n"));
  const [threshold, setThreshold] = useState(String(initialThreshold));
  const [slots, setSlots] = useState(initialSlots.join(", "));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    const communeList = communes
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);

    const slotList = slots
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const thresholdNum = Number(threshold);

    const result = await updateCoberturaSettings({
      coveredCommunes: communeList,
      freeShippingThreshold: thresholdNum,
      dispatchSlots: slotList,
    });

    setLoading(false);

    if (result.ok) {
      setSaved(true);
    } else {
      setError(`${result.code}${result.message ? `: ${result.message}` : ""}`);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Cobertura de Despacho</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configura las comunas cubiertas, umbral de envío gratis, y horarios disponibles.
        </p>
      </div>

      {/* Covered communes */}
      <div className="space-y-1">
        <label
          htmlFor="covered-communes"
          className="block text-sm font-medium text-gray-700"
        >
          Comunas cubiertas
          <span className="text-xs text-gray-400 ml-1">(una por línea)</span>
        </label>
        <textarea
          id="covered-communes"
          rows={5}
          value={communes}
          onChange={(e) => setCommunes(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {initialCommunes.length > 0 && (
          <p className="text-xs text-gray-400">
            Actuales: {initialCommunes.slice(0, 3).join(", ")}
            {initialCommunes.length > 3 ? ` y ${initialCommunes.length - 3} más` : ""}
          </p>
        )}
      </div>

      {/* Free shipping threshold */}
      <div className="space-y-1">
        <label
          htmlFor="shipping-threshold"
          className="block text-sm font-medium text-gray-700"
        >
          Umbral de envío gratis
          <span className="text-xs text-gray-400 ml-1">(en pesos)</span>
        </label>
        <input
          id="shipping-threshold"
          type="number"
          min={1}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Dispatch slots */}
      <div className="space-y-1">
        <label
          htmlFor="dispatch-slots"
          className="block text-sm font-medium text-gray-700"
        >
          Horarios de despacho
          <span className="text-xs text-gray-400 ml-1">(separados por coma)</span>
        </label>
        <input
          id="dispatch-slots"
          type="text"
          value={slots}
          onChange={(e) => setSlots(e.target.value)}
          placeholder="manana, tarde"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>

        {saved && (
          <span className="text-sm text-green-700 font-medium">Guardado correctamente</span>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
