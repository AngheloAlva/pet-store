import { createStore } from "@/app/actions/admin/stores";
import { StoreForm } from "@/components/admin/stores/store-form";

export default function NuevaSucursalPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Nueva sucursal</h1>
      <StoreForm mode="create" action={createStore} />
    </div>
  );
}
