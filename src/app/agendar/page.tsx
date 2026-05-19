import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadAllServices } from "@/lib/admin/services";
import { loadAllStores } from "@/db/loaders";
import { AgendarWizard } from "./wizard-client";

type SearchParams = Promise<{
  service?: string;
  store?: string;
  date?: string;
  slot?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

export default async function AgendarPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;

  const [allServices, allStores] = await Promise.all([
    loadAllServices(),
    loadAllStores(),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Agendar cita</h1>
      <AgendarWizard
        allServices={allServices}
        allStores={allStores}
        serviceParam={params.service}
        storeParam={params.store}
        dateParam={params.date}
        slotParam={params.slot}
        userEmail={user.email}
      />
    </div>
  );
}
