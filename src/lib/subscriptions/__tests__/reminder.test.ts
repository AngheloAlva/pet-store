/**
 * T-09 [DOMAIN] reminder.ts — shouldSendReminder
 * SN-5 dedup, ADR-5, R1 reconciliation
 */
import { describe, it, expect } from "vitest";
import { shouldSendReminder } from "../reminder";

const MS_DAY = 24 * 60 * 60 * 1000;

describe("shouldSendReminder (T-09)", () => {
  const reminderDays = 3;

  it("returns true when nextChargeAt is within reminderDays and no cycle row has reminderSentAt", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const nextChargeAt = new Date(now.getTime() + 2 * MS_DAY); // 2 days ahead — within 3-day window

    const result = shouldSendReminder(
      { nextChargeAt, status: "active" },
      [], // no cycle rows
      now,
      reminderDays,
    );
    expect(result).toBe(true);
  });

  it("returns false when nextChargeAt is outside the reminderDays window", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const nextChargeAt = new Date(now.getTime() + 10 * MS_DAY); // 10 days ahead

    const result = shouldSendReminder(
      { nextChargeAt, status: "active" },
      [],
      now,
      reminderDays,
    );
    expect(result).toBe(false);
  });

  it("returns false when a cycle row has reminderSentAt set for the current window", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const nextChargeAt = new Date(now.getTime() + 2 * MS_DAY);

    // There's a cycle row with reminderSentAt set — already sent
    const cycleRows = [
      {
        subscriptionId: "sub-1",
        reminderSentAt: new Date(now.getTime() - MS_DAY), // sent yesterday
      },
    ];

    const result = shouldSendReminder(
      { nextChargeAt, status: "active" },
      cycleRows,
      now,
      reminderDays,
    );
    expect(result).toBe(false);
  });

  it("returns false when subscription status is not active", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const nextChargeAt = new Date(now.getTime() + 2 * MS_DAY);

    const result = shouldSendReminder(
      { nextChargeAt, status: "paused" },
      [],
      now,
      reminderDays,
    );
    expect(result).toBe(false);
  });

  it("returns true when exactly on the boundary (nextChargeAt - now === reminderDays)", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const nextChargeAt = new Date(now.getTime() + reminderDays * MS_DAY); // exactly at boundary

    const result = shouldSendReminder(
      { nextChargeAt, status: "active" },
      [],
      now,
      reminderDays,
    );
    expect(result).toBe(true);
  });
});
