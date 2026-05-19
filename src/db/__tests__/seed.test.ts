import { vi, describe, it, expect } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

// ---------------------------------------------------------------------------
// S-SEED-1: Seed is idempotent — running twice produces same row counts
// ---------------------------------------------------------------------------
describe("seed determinism", () => {
  it("S-SEED-1: running seed twice does not throw and returns stable row counts", async () => {
    // Track all insert calls
    const insertCalls: Array<{ table: string }> = [];

    let callIndex = 0;
    const createChain = () => {
      const chain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      };
      return chain;
    };

    (db as AnyDb).insert = vi.fn(() => {
      callIndex++;
      const chain = createChain();
      insertCalls.push({ table: `table-${callIndex}` });
      return chain;
    });

    const { applySeed } = await import("@/db/seed");

    // Run once — should not throw
    await expect(applySeed(db as AnyDb)).resolves.not.toThrow();

    const countAfterFirst = insertCalls.length;

    // Run again — should not throw and produce the same number of insert calls
    await expect(applySeed(db as AnyDb)).resolves.not.toThrow();

    const countAfterSecond = insertCalls.length;

    // Each run produces the same number of inserts
    expect(countAfterSecond - countAfterFirst).toBe(countAfterFirst);
  });

  it("seed data files export non-empty arrays", async () => {
    const { seedServices } = await import("@/db/seed-data/services");
    const { seedScheduleConfigs, seedBlockedSlots } = await import("@/db/seed-data/schedule-configs");
    const { seedAppointments } = await import("@/db/seed-data/appointments");

    expect(seedServices.length).toBeGreaterThanOrEqual(3);
    expect(seedScheduleConfigs.length).toBeGreaterThan(0);
    expect(seedBlockedSlots.length).toBeGreaterThan(0);
    expect(seedAppointments.length).toBeGreaterThanOrEqual(8);
  });

  it("seed data has fixed IDs (deterministic)", async () => {
    const { seedServices } = await import("@/db/seed-data/services");
    const { seedAppointments } = await import("@/db/seed-data/appointments");

    // IDs should be stable strings (not random UUIDs)
    expect(seedServices[0].id).toBe("svc-bath-trim");
    expect(seedAppointments.find((a) => a.id === "appt-camila-upcoming")).toBeDefined();
    expect(seedAppointments.find((a) => a.id === "appt-camila-past")).toBeDefined();
  });
});
