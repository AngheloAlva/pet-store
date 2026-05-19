import { db, dbReady } from "@/db";
import { scheduleConfigs, blockedSlots } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ScheduleConfigRow = {
  id: string;
  storeId: string;
  serviceId: string | null;
  weekday: number;
  startHHMM: number;
  endHHMM: number;
  slotMinutes: number;
  active: boolean;
};

export type BlockedSlotRow = {
  id: string;
  storeId: string;
  serviceId: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

export async function loadScheduleConfigs(storeId?: string): Promise<ScheduleConfigRow[]> {
  await dbReady;
  const rows = storeId
    ? await db.select().from(scheduleConfigs).where(eq(scheduleConfigs.storeId, storeId))
    : await db.select().from(scheduleConfigs);
  return rows;
}

export async function loadBlockedSlots(storeId?: string): Promise<BlockedSlotRow[]> {
  await dbReady;
  const rows = storeId
    ? await db.select().from(blockedSlots).where(eq(blockedSlots.storeId, storeId))
    : await db.select().from(blockedSlots);
  return rows.map((r) => ({
    id: r.id,
    storeId: r.storeId,
    serviceId: r.serviceId,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    reason: r.reason,
  }));
}
