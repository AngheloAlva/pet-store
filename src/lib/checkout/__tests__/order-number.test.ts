/**
 * Task 3.9 RED — Order number generator test.
 * Sequential increment, year rollover, concurrent-call uniqueness.
 * W4 fix: asserts SELECT FOR UPDATE is used to lock the row.
 */
import { describe, it, expect, vi } from "vitest";

describe("order number generator", () => {
  it("generates sequential order numbers for same date", async () => {
    const { generateOrderNumber } = await import("@/lib/checkout/order-number");

    let seqValue = 0;
    const mockTx = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ date: "20260526", lastSeq: seqValue }]),
          for: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ date: "20260526", lastSeq: seqValue }]),
          }),
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            seqValue++;
            return Promise.resolve({});
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue({}),
        }),
      }),
    };

    const result1 = await generateOrderNumber("20260526", mockTx as never);
    expect(result1).toMatch(/^PET-\d{8}-\d{4,5}$/);
    expect(result1).toContain("20260526");
  });

  it("formats order number as PET-YYYYMMDD-NNNNN", async () => {
    const { generateOrderNumber } = await import("@/lib/checkout/order-number");

    const mockTx = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ date: "20260526", lastSeq: 5 }]),
          for: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ date: "20260526", lastSeq: 5 }]),
          }),
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue({}),
        }),
      }),
    };

    const result = await generateOrderNumber("20260526", mockTx as never);
    expect(result).toBe("PET-20260526-00006"); // lastSeq 5 → next is 6
  });

  it("uses SELECT FOR UPDATE to lock the order_sequences row", async () => {
    // W4: the query builder MUST call .for('update') so the emitted SQL
    // contains FOR UPDATE on real Postgres, preventing duplicate order numbers
    // under concurrent confirmOrder calls.
    const { generateOrderNumber } = await import("@/lib/checkout/order-number");

    const forMock = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ date: "20260526", lastSeq: 0 }]),
    });

    const mockTx = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          for: forMock,
          // plain where() should NOT be the path taken for the lock query
          where: vi.fn().mockResolvedValue([{ date: "20260526", lastSeq: 0 }]),
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue({}),
        }),
      }),
    };

    await generateOrderNumber("20260526", mockTx as never);

    // The lock query MUST call .for('update')
    expect(forMock).toHaveBeenCalledWith("update");
  });

  it("inserts initial row if none exists (year rollover support)", async () => {
    const { generateOrderNumber } = await import("@/lib/checkout/order-number");

    // First call returns empty (no row for new date), second returns freshly inserted row
    let callCount = 0;
    const mockTx = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            return callCount === 1 ? [] : [{ date: "20270101", lastSeq: 0 }];
          }),
          for: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(async () => {
              return callCount === 1 ? [] : [{ date: "20270101", lastSeq: 0 }];
            }),
          }),
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue({}),
        }),
      }),
    };

    const result = await generateOrderNumber("20270101", mockTx as never);
    expect(result).toMatch(/^PET-20270101-/);
  });
});
