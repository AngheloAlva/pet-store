import type { InferInsertModel } from "drizzle-orm";
import { scheduleConfigs, blockedSlots } from "@/db/schema";

type NewScheduleConfig = InferInsertModel<typeof scheduleConfigs>;
type NewBlockedSlot = InferInsertModel<typeof blockedSlots>;

// Mon–Fri (1–5), 09:00–18:00, 30-min slots — store-wide defaults
const WEEKDAYS = [1, 2, 3, 4, 5];

function makeConfigs(storeId: string, baseId: string): NewScheduleConfig[] {
  return WEEKDAYS.map((weekday) => ({
    id: `${baseId}-wd${weekday}`,
    storeId,
    serviceId: null, // store-wide default
    weekday,
    startHHMM: 900, // 09:00
    endHHMM: 1800, // 18:00
    slotMinutes: 30,
    active: true,
  }));
}

export const seedScheduleConfigs: NewScheduleConfig[] = [
  ...makeConfigs("providencia", "sc-prov"),
  ...makeConfigs("las-condes", "sc-lc"),
];

export const seedBlockedSlots: NewBlockedSlot[] = [
  {
    id: "bs-prov-feriado",
    storeId: "providencia",
    serviceId: null,
    startsAt: new Date("2026-06-01T00:00:00.000Z"),
    endsAt: new Date("2026-06-02T00:00:00.000Z"),
    reason: "Día del Trabajo",
  },
  {
    id: "bs-lc-feriado",
    storeId: "las-condes",
    serviceId: null,
    startsAt: new Date("2026-06-01T00:00:00.000Z"),
    endsAt: new Date("2026-06-02T00:00:00.000Z"),
    reason: "Día del Trabajo",
  },
];
