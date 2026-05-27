/**
 * Task 3.13 RED — Idempotency helper test.
 * Same key → same result; different key → new result.
 */
import { describe, it, expect, vi } from "vitest";

describe("idempotency helpers", () => {
  it("findCompletedOrder returns existing order for already-completed session", async () => {
    const { findCompletedOrder } = await import("@/lib/checkout/idempotency");

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "order-1", orderNumber: "PET-20260526-00001" },
            ]),
          }),
        }),
      }),
    };

    const result = await findCompletedOrder(mockDb as never, "session-completed");
    expect(result).not.toBeNull();
    expect(result?.orderNumber).toBe("PET-20260526-00001");
  });

  it("findCompletedOrder returns null for session with no order", async () => {
    const { findCompletedOrder } = await import("@/lib/checkout/idempotency");

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // no order
          }),
        }),
      }),
    };

    const result = await findCompletedOrder(mockDb as never, "session-new");
    expect(result).toBeNull();
  });
});
