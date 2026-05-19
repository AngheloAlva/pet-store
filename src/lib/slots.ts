/**
 * Pure slot engine — no DB access.
 * Callers are responsible for applying ScheduleConfig precedence
 * (service-specific over store-wide) BEFORE passing configs here.
 */
import { addMinutes, areIntervalsOverlapping } from "date-fns";

// ---------------------------------------------------------------------------
// Input types (DB row shapes, minimal fields needed)
// ---------------------------------------------------------------------------
export interface ScheduleConfigRow {
  id: string;
  storeId: string;
  serviceId: string | null;
  weekday: number;
  startHHMM: number; // e.g. 900 = 09:00
  endHHMM: number;
  slotMinutes: number;
  active: boolean;
}

export interface BlockedSlotRow {
  id: string;
  storeId: string;
  serviceId: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  createdAt: Date;
}

export interface AppointmentRow {
  id: string;
  userId: string;
  serviceId: string;
  storeId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  available: boolean;
}

export interface SlotInput {
  storeId: string;
  service: { id: string; durationMin: number };
  date: string; // ISO date "YYYY-MM-DD"
  configs: ScheduleConfigRow[];
  blockedSlots: BlockedSlotRow[];
  existingAppointments: AppointmentRow[];
  stepMin?: number; // default = slotMinutes from config
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hhmm(n: number): { hours: number; minutes: number } {
  return { hours: Math.floor(n / 100), minutes: n % 100 };
}

function buildDate(dateStr: string, hh: number, mm: number): Date {
  // Build UTC date with the given time components
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hh, mm, 0, 0));
}

// ---------------------------------------------------------------------------
// generateSlots
// ---------------------------------------------------------------------------
export function generateSlots(input: SlotInput): Slot[] {
  const { service, date, configs, blockedSlots, existingAppointments } = input;

  // Determine day-of-week for the requested date (UTC — avoids TZ shift)
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay(); // 0=Sunday

  // Filter active configs for this weekday
  const dayConfigs = configs.filter((c) => c.active && c.weekday === weekday);
  if (dayConfigs.length === 0) return [];

  // Scheduled appointments only block slots (canceled/no_show free the window)
  const scheduledAppts = existingAppointments.filter((a) => a.status === "scheduled");

  const slots: Slot[] = [];

  for (const cfg of dayConfigs) {
    const { hours: startH, minutes: startM } = hhmm(cfg.startHHMM);
    const { hours: endH, minutes: endM } = hhmm(cfg.endHHMM);

    const windowStart = buildDate(date, startH, startM);
    const windowEnd = buildDate(date, endH, endM);

    const stepMin = input.stepMin ?? cfg.slotMinutes;
    let cursor = windowStart;

    while (cursor < windowEnd) {
      const slotEnd = addMinutes(cursor, service.durationMin);

      // Exclude cross-midnight slots: slotEnd must not exceed windowEnd
      // (strict: slotEnd > windowEnd means it spills past closing time)
      if (slotEnd > windowEnd) break;

      // Check availability
      const slotInterval = { start: cursor, end: slotEnd };

      const blockedBySlot = blockedSlots.some((bs) =>
        areIntervalsOverlapping(slotInterval, { start: bs.startsAt, end: bs.endsAt }),
      );

      const takenByAppt = scheduledAppts.some(
        (a) => a.startsAt.getTime() === cursor.getTime(),
      );

      slots.push({
        startsAt: new Date(cursor),
        endsAt: new Date(slotEnd),
        available: !blockedBySlot && !takenByAppt,
      });

      cursor = addMinutes(cursor, stepMin);
    }
  }

  return slots;
}
