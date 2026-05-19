import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAllPets } from "@/lib/admin/pets";

const SPECIES_LABELS: Record<string, string> = {
  dog: "Perro",
  cat: "Gato",
  exotic: "Exótico",
};

export default async function MascotasAdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const allPets = await getAllPets({});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mascotas</h1>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Especie</th>
              <th className="px-4 py-2 text-left">Raza</th>
              <th className="px-4 py-2 text-left">Usuario</th>
              <th className="px-4 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {allPets.map((pet) => (
              <tr key={pet.id} className="border-b last:border-b-0">
                <td className="px-4 py-2 font-medium">{pet.name}</td>
                <td className="px-4 py-2">
                  {SPECIES_LABELS[pet.species] ?? pet.species}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {pet.breed ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">
                  {pet.userId}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      pet.active
                        ? "text-green-600 font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {pet.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
