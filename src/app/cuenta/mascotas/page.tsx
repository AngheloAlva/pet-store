import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOwnPets } from "@/lib/pets";
import { MascotasClient } from "./mascotas-client";

export default async function MascotasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const pets = await getOwnPets(user.id);

  return (
    <div className="container mx-auto py-8 px-4">
      <MascotasClient pets={pets} userId={user.id} />
    </div>
  );
}
