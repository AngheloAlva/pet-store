"use client";

import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
}

interface StorePickerProps {
  stores: Store[];
  mode?: "full" | "compact";
  currentStoreId?: string | null;
}

export function StorePicker({ stores, mode = "full", currentStoreId }: StorePickerProps) {
  const router = useRouter();

  const handleChange = (storeId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("store", storeId);
    router.replace(url.pathname + url.search);
  };

  if (mode === "compact") {
    return (
      <select
        value={currentStoreId ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded border border-border bg-background px-2 py-1 text-sm"
        aria-label="Cambiar sucursal"
      >
        <option value="">Seleccionar sucursal</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 max-w-sm">
      <h2 className="text-lg font-semibold">Elegí tu sucursal</h2>
      <select
        defaultValue=""
        onChange={(e) => handleChange(e.target.value)}
        className="h-12 rounded border border-border bg-background px-3 text-base"
        aria-label="Seleccionar sucursal"
      >
        <option value="" disabled>
          Seleccionar sucursal…
        </option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
