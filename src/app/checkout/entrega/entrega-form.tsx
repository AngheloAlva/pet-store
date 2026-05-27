"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitAddress } from "@/app/actions/checkout/submit-address";

interface EntregaFormProps {
  sessionId: string;
  communes: readonly string[];
  initialAddress: Record<string, string> | null;
}

export function EntregaForm({ sessionId, communes, initialAddress }: EntregaFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [communeError, setCommuneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCommuneError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const result = await submitAddress({
      sessionId,
      address: {
        recipientName: formData.get("recipientName") as string,
        street: formData.get("street") as string,
        number: formData.get("number") as string,
        apartment: formData.get("apartment") as string || undefined,
        commune: formData.get("commune") as string,
        region: formData.get("region") as string,
        phone: formData.get("phone") as string,
      },
    });

    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "COMMUNE_NOT_COVERED") {
        setCommuneError("Esta comuna no está cubierta por nuestro servicio de despacho.");
      } else if (result.code === "SESSION_EXPIRED") {
        setError("Tu sesión de checkout expiró. Por favor vuelve al carrito.");
      } else {
        setError("Ocurrió un error. Por favor intenta nuevamente.");
      }
      return;
    }

    router.push("/checkout/envio");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del destinatario
        </label>
        <input
          type="text"
          name="recipientName"
          defaultValue={initialAddress?.recipientName}
          required
          minLength={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Calle</label>
          <input
            type="text"
            name="street"
            defaultValue={initialAddress?.street}
            required
            minLength={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
          <input
            type="text"
            name="number"
            defaultValue={initialAddress?.number}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Departamento / Oficina (opcional)
        </label>
        <input
          type="text"
          name="apartment"
          defaultValue={initialAddress?.apartment}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comuna{" "}
          <span className="text-gray-400 font-normal">(solo comunas cubiertas)</span>
        </label>
        <input
          type="text"
          name="commune"
          defaultValue={initialAddress?.commune}
          required
          list="communes-list"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Ej: Providencia, Las Condes..."
        />
        <datalist id="communes-list">
          {communes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {communeError && <p className="mt-1 text-sm text-red-600">{communeError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Región</label>
        <input
          type="text"
          name="region"
          defaultValue={initialAddress?.region ?? "Región Metropolitana"}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teléfono de contacto
        </label>
        <input
          type="tel"
          name="phone"
          defaultValue={initialAddress?.phone}
          required
          placeholder="+56912345678"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
      >
        {submitting ? "Guardando..." : "Continuar al envío"}
      </button>
    </form>
  );
}
