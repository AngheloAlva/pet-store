import Link from "next/link";
import { loadAdminStoreRows } from "@/lib/admin/stores";
import { StoreListClient } from "@/components/admin/stores/store-list-client";

export default async function SucursalesPage() {
  const stores = await loadAdminStoreRows();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sucursales</h1>
        <Link
          href="/admin/sucursales/nueva"
          className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nueva sucursal
        </Link>
      </div>

      <StoreListClient rows={stores} />
    </div>
  );
}
