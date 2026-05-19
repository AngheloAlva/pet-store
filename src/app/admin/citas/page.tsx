import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAppointments } from "@/lib/admin/appointments";
import { AppointmentsClient } from "@/components/admin/appointments/appointments-client";

type SearchParams = Promise<{
  storeId?: string;
  status?: string;
  from?: string;
  to?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

export default async function CitasAdminPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const params = await searchParams;

  const rows = await getAppointments({
    storeId: params.storeId,
    dateRangeStart: params.from ? new Date(params.from) : undefined,
    dateRangeEnd: params.to ? new Date(params.to) : undefined,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Citas</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} cita{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <AppointmentsClient rows={rows} />
    </div>
  );
}
