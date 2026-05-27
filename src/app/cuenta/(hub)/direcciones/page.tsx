import { listAddresses } from "@/app/actions/cuenta/direcciones";
import { DireccionForm } from "./direccion-form";

export default async function DireccionesPage() {
  const addresses = await listAddresses();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Direcciones</h1>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-12 space-y-4 border rounded-md">
          <p className="text-muted-foreground text-sm">
            Todavía no tenés direcciones guardadas.
          </p>
          <h2 className="text-base font-semibold">Agregar dirección</h2>
          <div className="max-w-lg mx-auto px-4">
            <DireccionForm />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {addresses.map((address) => (
              <li
                key={address.id}
                className="border rounded-md px-4 py-4 space-y-1 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{address.label}</span>
                  {address.isDefault && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Predeterminada
                    </span>
                  )}
                </div>
                <p className="text-sm">{address.name}</p>
                <p className="text-sm text-muted-foreground">
                  {address.street}, {address.commune}, {address.region}
                </p>
                <p className="text-sm text-muted-foreground">{address.phone}</p>
                {address.notes && (
                  <p className="text-xs text-muted-foreground italic">{address.notes}</p>
                )}
                <AddressActions addressId={address.id} isDefault={address.isDefault} />
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-4">Agregar dirección</h2>
            <DireccionForm />
          </div>
        </div>
      )}
    </div>
  );
}

function AddressActions({
  addressId,
  isDefault,
}: {
  addressId: string;
  isDefault: boolean;
}) {
  return (
    <div className="flex gap-2 mt-2">
      {!isDefault && (
        <form
          action={async () => {
            "use server";
            const { setDefaultAddress } = await import("@/app/actions/cuenta/direcciones");
            await setDefaultAddress(addressId);
          }}
        >
          <button
            type="submit"
            className="text-xs text-primary hover:underline"
          >
            Usar como predeterminada
          </button>
        </form>
      )}
      <form
        action={async () => {
          "use server";
          const { deleteAddress } = await import("@/app/actions/cuenta/direcciones");
          await deleteAddress(addressId);
        }}
      >
        <button
          type="submit"
          className="text-xs text-destructive hover:underline"
        >
          Eliminar
        </button>
      </form>
    </div>
  );
}
