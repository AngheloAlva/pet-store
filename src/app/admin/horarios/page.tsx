import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadScheduleConfigs, loadBlockedSlots } from "@/lib/admin/schedule-configs";
import { ScheduleClient } from "@/components/admin/schedule/schedule-client";

export default async function HorariosPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const [scheduleConfigs, blockedSlots] = await Promise.all([
    loadScheduleConfigs(),
    loadBlockedSlots(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Horarios</h1>
      </div>
      <ScheduleClient scheduleConfigs={scheduleConfigs} blockedSlots={blockedSlots} />
    </div>
  );
}
