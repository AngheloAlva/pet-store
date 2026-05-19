import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadAllServices } from "@/lib/admin/services";
import { ServiceListClient } from "@/components/admin/services/service-list-client";

export default async function ServiciosPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const rows = await loadAllServices();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servicios</h1>
      </div>
      <ServiceListClient rows={rows} onAdd={() => {}} />
    </div>
  );
}
