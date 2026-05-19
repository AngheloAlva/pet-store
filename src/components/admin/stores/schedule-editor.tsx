"use client";

import type { StoreSchedule } from "@/app/actions/admin/stores.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type Props = {
  value: StoreSchedule;
  onChange: (next: StoreSchedule) => void;
};

const DAY_LABELS: Record<Day, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

const DAYS: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// ---------------------------------------------------------------------------
// ScheduleEditor
// ---------------------------------------------------------------------------
export function ScheduleEditor({ value, onChange }: Props) {
  function handleClosedChange(day: Day, checked: boolean) {
    const next = { ...value };
    if (checked) {
      next[day] = { closed: true };
    } else {
      next[day] = { open: "09:00", close: "18:00" };
    }
    onChange(next as StoreSchedule);
  }

  function handleTimeChange(
    day: Day,
    field: "open" | "close",
    timeValue: string,
  ) {
    const current = value[day];
    if ("closed" in current && current.closed) return;
    const next = { ...value };
    next[day] = { ...current, [field]: timeValue } as { open: string; close: string };
    onChange(next as StoreSchedule);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Horario</legend>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const dayValue = value[day];
          const isClosed = "closed" in dayValue && dayValue.closed;

          return (
            <div
              key={day}
              className="grid grid-cols-[6rem_auto_1fr_1fr] items-center gap-2 sm:grid-cols-[6rem_auto_1fr_1fr]"
            >
              {/* Day label */}
              <span className="text-sm">{DAY_LABELS[day]}</span>

              {/* Closed checkbox */}
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  aria-label={`${DAY_LABELS[day]} cerrado`}
                  checked={isClosed}
                  onChange={(e) => handleClosedChange(day, e.target.checked)}
                />
                <span>Cerrado</span>
              </label>

              {/* Open time */}
              <div>
                <label htmlFor={`schedule-${day}-open`} className="sr-only">
                  {DAY_LABELS[day]} apertura
                </label>
                <input
                  id={`schedule-${day}-open`}
                  type="time"
                  className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isClosed}
                  value={isClosed ? "" : (dayValue as { open: string; close: string }).open}
                  onChange={(e) => handleTimeChange(day, "open", e.target.value)}
                />
              </div>

              {/* Close time */}
              <div>
                <label htmlFor={`schedule-${day}-close`} className="sr-only">
                  {DAY_LABELS[day]} cierre
                </label>
                <input
                  id={`schedule-${day}-close`}
                  type="time"
                  className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isClosed}
                  value={isClosed ? "" : (dayValue as { open: string; close: string }).close}
                  onChange={(e) => handleTimeChange(day, "close", e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
