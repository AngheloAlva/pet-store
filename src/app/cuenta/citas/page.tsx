import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAppointments } from "@/lib/admin/appointments";
import { CitasClient } from "./citas-client";

export default async function CitasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allAppts = await getAppointments({ storeId: undefined });
  const userAppts = allAppts.filter((a) => a.userId === user.id);

  const now = new Date();

  const upcoming = userAppts.filter(
    (a) => a.status === "scheduled" && a.startsAt >= now,
  );

  const history = userAppts.filter(
    (a) => a.status !== "scheduled" || a.startsAt < now,
  );

  return (
    <div className="container mx-auto py-8 px-4 space-y-10">
      <h1 className="text-3xl font-bold">Mis citas</h1>

      {/* Upcoming */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Próximas citas</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tenés citas programadas próximamente.
          </p>
        ) : (
          <CitasClient rows={upcoming} showCancel />
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Historial</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sin citas en el historial.
          </p>
        ) : (
          <CitasClient rows={history} showCancel={false} />
        )}
      </section>
    </div>
  );
}
