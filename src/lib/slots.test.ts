import { describe, it, expect } from "vitest";
import { generateSlots } from "./slots";
import type { SlotInput } from "./slots";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeDate(isoDate: string, hhmm: number): Date {
  const hours = Math.floor(hhmm / 100);
  const minutes = hhmm % 100;
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

function monday(): string {
  // 2026-01-05 is a Monday
  return "2026-01-05";
}

function baseConfig() {
  return {
    id: "cfg-1",
    storeId: "providencia",
    serviceId: "bath-trim",
    weekday: 1, // Monday
    startHHMM: 900, // 09:00
    endHHMM: 1200, // 12:00
    slotMinutes: 60,
    active: true,
  };
}

function baseInput(overrides?: Partial<SlotInput>): SlotInput {
  return {
    storeId: "providencia",
    service: { id: "bath-trim", durationMin: 60 },
    date: monday(),
    configs: [baseConfig()],
    blockedSlots: [],
    existingAppointments: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// S-SLOT-1: Happy path — 3 slots generated for Mon 09:00–12:00, 60min
// ---------------------------------------------------------------------------
describe("generateSlots", () => {
  it("S-SLOT-1: returns 3 available slots for Mon 09:00–12:00, 60min", () => {
    const slots = generateSlots(baseInput());
    expect(slots).toHaveLength(3);
    expect(slots[0].available).toBe(true);
    expect(slots[1].available).toBe(true);
    expect(slots[2].available).toBe(true);
    // Verify start times
    expect(slots[0].startsAt.getUTCHours()).toBe(9);
    expect(slots[1].startsAt.getUTCHours()).toBe(10);
    expect(slots[2].startsAt.getUTCHours()).toBe(11);
  });

  // -------------------------------------------------------------------------
  // S-SLOT-2: Blocked slot partial overlap marks slots unavailable
  // -------------------------------------------------------------------------
  it("S-SLOT-2: blocked 09:30–10:30 marks 09:00 and 10:00 unavailable, 11:00 available", () => {
    const input = baseInput({
      blockedSlots: [
        {
          id: "bs-1",
          storeId: "providencia",
          serviceId: null,
          startsAt: makeDate(monday(), 930), // 09:30
          endsAt: makeDate(monday(), 1030), // 10:30
          reason: null,
          createdAt: new Date(),
        },
      ],
    });
    const slots = generateSlots(input);
    expect(slots).toHaveLength(3);
    expect(slots[0].available).toBe(false); // 09:00 overlaps block start
    expect(slots[1].available).toBe(false); // 10:00 overlaps block end
    expect(slots[2].available).toBe(true);  // 11:00 clear
  });

  // -------------------------------------------------------------------------
  // S-SLOT-3: Canceled appointment frees the slot
  // -------------------------------------------------------------------------
  it("S-SLOT-3: canceled appointment at 10:00 does NOT block the slot", () => {
    const input = baseInput({
      existingAppointments: [
        {
          id: "appt-1",
          userId: "user-1",
          serviceId: "bath-trim",
          storeId: "providencia",
          startsAt: makeDate(monday(), 1000),
          endsAt: makeDate(monday(), 1100),
          status: "canceled",
        },
      ],
    });
    const slots = generateSlots(input);
    const tenSlot = slots.find((s) => s.startsAt.getUTCHours() === 10);
    expect(tenSlot?.available).toBe(true);
  });

  // -------------------------------------------------------------------------
  // S-SLOT-4: No config returns empty array
  // -------------------------------------------------------------------------
  it("S-SLOT-4: no config for requested weekday returns []", () => {
    const input = baseInput({
      // 2026-01-06 is a Tuesday; config is for Monday (weekday=1)
      date: "2026-01-06",
    });
    const slots = generateSlots(input);
    expect(slots).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // S-SLOT-5: durationMin > slotMinutes — slot that extends past endHHMM excluded
  // -------------------------------------------------------------------------
  it("S-SLOT-5: 30min slots, 60min service — 10:30 slot excluded (would end at 11:30 > 11:00)", () => {
    const input = baseInput({
      service: { id: "bath-trim", durationMin: 60 },
      configs: [
        {
          ...baseConfig(),
          startHHMM: 900,
          endHHMM: 1100, // 09:00–11:00
          slotMinutes: 30,
        },
      ],
    });
    // Slots at 09:00 (ends 10:00 ✓), 09:30 (ends 10:30 ✓), 10:00 (ends 11:00 ✓)
    // 10:30 would end at 11:30 > 11:00 → excluded
    const slots = generateSlots(input);
    expect(slots).toHaveLength(3);
    const startHours = slots.map((s) => s.startsAt.getUTCHours() * 100 + s.startsAt.getUTCMinutes());
    expect(startHours).toContain(900);
    expect(startHours).toContain(930);
    expect(startHours).toContain(1000);
    expect(startHours).not.toContain(1030);
  });

  // -------------------------------------------------------------------------
  // S-SCHEMA-6 / precedence: caller passes pre-filtered configs
  // This test verifies that generateSlots uses whatever configs are passed —
  // it has no internal precedence logic.
  // -------------------------------------------------------------------------
  it("S-SCHEMA-6: uses whatever configs are passed (precedence is caller's responsibility)", () => {
    // Pass only service-specific config — store-wide is NOT passed
    const serviceSpecific = {
      ...baseConfig(),
      serviceId: "bath-trim",
      startHHMM: 800, // 08:00
      endHHMM: 900,   // 09:00 — 1 slot
      slotMinutes: 60,
    };
    const slots = generateSlots(baseInput({ configs: [serviceSpecific] }));
    expect(slots).toHaveLength(1);
    expect(slots[0].startsAt.getUTCHours()).toBe(8);
  });

  // -------------------------------------------------------------------------
  // Cross-midnight exclusion
  // -------------------------------------------------------------------------
  it("cross-midnight: slot starting at 23:00 with 120min duration excluded (would end 01:00 next day)", () => {
    const input = baseInput({
      service: { id: "bath-trim", durationMin: 120 },
      configs: [
        {
          ...baseConfig(),
          startHHMM: 2200, // 22:00
          endHHMM: 2359,   // 23:59
          slotMinutes: 60,
        },
      ],
    });
    // 22:00 slot ends 00:00 ✓ (exactly midnight boundary, acceptable)
    // 23:00 slot ends 01:00 next day → excluded
    const slots = generateSlots(input);
    const cross = slots.find((s) => s.startsAt.getUTCHours() === 23);
    expect(cross).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Scheduled appointment blocks slot
  // -------------------------------------------------------------------------
  it("scheduled appointment at 10:00 marks that slot unavailable", () => {
    const input = baseInput({
      existingAppointments: [
        {
          id: "appt-2",
          userId: "user-2",
          serviceId: "bath-trim",
          storeId: "providencia",
          startsAt: makeDate(monday(), 1000),
          endsAt: makeDate(monday(), 1100),
          status: "scheduled",
        },
      ],
    });
    const slots = generateSlots(input);
    const tenSlot = slots.find((s) => s.startsAt.getUTCHours() === 10);
    expect(tenSlot?.available).toBe(false);
  });

  // -------------------------------------------------------------------------
  // no_show appointment frees slot
  // -------------------------------------------------------------------------
  it("no_show appointment does NOT block slot (same as canceled)", () => {
    const input = baseInput({
      existingAppointments: [
        {
          id: "appt-3",
          userId: "user-3",
          serviceId: "bath-trim",
          storeId: "providencia",
          startsAt: makeDate(monday(), 1000),
          endsAt: makeDate(monday(), 1100),
          status: "no_show",
        },
      ],
    });
    const slots = generateSlots(input);
    const tenSlot = slots.find((s) => s.startsAt.getUTCHours() === 10);
    expect(tenSlot?.available).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Multiple configs (e.g. two time windows in a day)
  // -------------------------------------------------------------------------
  it("multiple configs for same weekday generate slots from all windows", () => {
    const input = baseInput({
      configs: [
        { ...baseConfig(), startHHMM: 900, endHHMM: 1000, slotMinutes: 60 },
        { ...baseConfig(), id: "cfg-2", startHHMM: 1400, endHHMM: 1500, slotMinutes: 60 },
      ],
    });
    const slots = generateSlots(input);
    expect(slots).toHaveLength(2);
    expect(slots[0].startsAt.getUTCHours()).toBe(9);
    expect(slots[1].startsAt.getUTCHours()).toBe(14);
  });

  // -------------------------------------------------------------------------
  // Blocked slot with null serviceId blocks all
  // -------------------------------------------------------------------------
  it("S-SCHEMA-3: blocked_slot with null serviceId still blocks slots", () => {
    const input = baseInput({
      blockedSlots: [
        {
          id: "bs-all",
          storeId: "providencia",
          serviceId: null,
          startsAt: makeDate(monday(), 900),
          endsAt: makeDate(monday(), 1200),
          reason: "Feriado",
          createdAt: new Date(),
        },
      ],
    });
    const slots = generateSlots(input);
    expect(slots.every((s) => !s.available)).toBe(true);
  });
});
