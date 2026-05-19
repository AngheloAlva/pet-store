import { notFound } from "next/navigation";
import { loadStoreForEdit } from "@/lib/admin/stores";
import { updateStore } from "@/app/actions/admin/stores";
import { StoreForm } from "@/components/admin/stores/store-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarSucursalPage({ params }: Props) {
  const { id } = await params;
  const store = await loadStoreForEdit(id);

  if (!store) notFound();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Editar sucursal</h1>
      <StoreForm
        mode="edit"
        initial={store}
        action={updateStore.bind(null, id)}
      />
    </div>
  );
}
