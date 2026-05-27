"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { selectShipping } from "@/app/actions/checkout/select-shipping";
import { selectPickupStore } from "@/app/actions/checkout/select-pickup-store";
import type { ShippingOption } from "@/lib/checkout/shipping";

interface StoreOption {
  id: string;
  name: string;
  address: string;
  commune: string;
}

interface EnvioFormProps {
  sessionId: string;
  mode: "despacho" | "pickup" | "courier" | string;
  stores: StoreOption[];
  selectedStoreId: string | null;
  options: readonly ShippingOption[];
  selectedOptionId: string | null;
  dispatchSlots?: string[];
  selectedDispatchSlot?: string | null;
}

export function EnvioForm({
  sessionId,
  mode,
  stores,
  selectedStoreId,
  options,
  selectedOptionId,
  dispatchSlots = [],
  selectedDispatchSlot = null,
}: EnvioFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(selectedOptionId ?? "");
  const [selectedStore, setSelectedStore] = useState(selectedStoreId ?? "");
  const [selectedSlot, setSelectedSlot] = useState(selectedDispatchSlot ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === "pickup") {
      if (!selectedStore) {
        setError("Seleccioná una tienda de retiro.");
        setSubmitting(false);
        return;
      }

      const result = await selectPickupStore({ sessionId, storeId: selectedStore });
      setSubmitting(false);

      if (!result.ok) {
        if (result.code === "SESSION_EXPIRED") {
          setError("Tu sesión expiró. Por favor volvé al carrito.");
        } else if (result.code === "STORE_NOT_FOUND") {
          setError("La tienda seleccionada no está disponible.");
        } else {
          setError("Error al seleccionar tienda. Por favor intentá nuevamente.");
        }
        return;
      }

      router.push("/checkout/resumen");
      return;
    }

    // despacho / courier path
    if (!selected) {
      setError("Seleccioná un método de envío.");
      setSubmitting(false);
      return;
    }

    const result = await selectShipping({
      sessionId,
      shippingOptionId: selected,
      ...(selectedSlot && selected === "propio" ? { dispatchSlot: selectedSlot } : {}),
    });

    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "SESSION_EXPIRED") {
        setError("Tu sesión expiró. Por favor volvé al carrito.");
      } else {
        setError("Error al seleccionar envío. Por favor intentá nuevamente.");
      }
      return;
    }

    router.push("/checkout/resumen");
  }

  if (mode === "pickup") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {stores.length === 0 && (
          <p className="text-gray-500 text-sm">No hay tiendas disponibles por el momento.</p>
        )}
        {stores.map((store) => (
          <label
            key={store.id}
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedStore === store.id
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="storeId"
              value={store.id}
              checked={selectedStore === store.id}
              onChange={() => setSelectedStore(store.id)}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-gray-900">{store.name}</p>
              <p className="text-sm text-gray-500">{store.address}, {store.commune}</p>
            </div>
          </label>
        ))}

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={(!selectedStore && stores.length > 0) || submitting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
        >
          {submitting ? "Guardando..." : "Confirmar retiro en tienda"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {options.map((option) => (
        <div key={option.id}>
          <label
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
                  {option.cost === 0 ? "Gratis" : `$${option.cost.toLocaleString("es-CL")}`}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
            </div>
          </label>

          {/* Dispatch slot selector for propio */}
          {selected === option.id && option.id === "propio" && dispatchSlots.length > 0 && (
            <div className="ml-6 mt-2 space-y-2">
              <p className="text-sm font-medium text-gray-700">Horario de entrega:</p>
              {dispatchSlots.map((slot) => (
                <label key={slot} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dispatchSlot"
                    value={slot}
                    checked={selectedSlot === slot}
                    onChange={() => setSelectedSlot(slot)}
                  />
                  <span className="text-sm text-gray-700 capitalize">{slot}</span>
                </label>
              ))}
            </div>
          )}
        </div>
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
