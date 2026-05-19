import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserPointsBalance", () => {
  it("returns 0 when no transactions exist", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        })),
      })),
    }));

    const { getUserPointsBalance } = await import("@/lib/admin/points");
    const result = await getUserPointsBalance("user-nobody");
    expect(result).toBe(0);
  });

  it("returns balanceAfter of latest transaction", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => [{ balanceAfter: 2500 }]),
          })),
        })),
      })),
    }));

    const { getUserPointsBalance } = await import("@/lib/admin/points");
    const result = await getUserPointsBalance("user-camila-demo");
    expect(result).toBe(2500);
  });
});

describe("getUserPointsHistory", () => {
  it("defaults to limit=20 and returns ordered results", async () => {
    const mockRows = [
      { id: "tx-3", balanceAfter: 650, deltaPoints: -200, createdAt: new Date("2026-03-01") },
      { id: "tx-2", balanceAfter: 850, deltaPoints: 350, createdAt: new Date("2026-02-01") },
      { id: "tx-1", balanceAfter: 500, deltaPoints: 500, createdAt: new Date("2026-01-01") },
    ];

    const mockLimit = vi.fn(async () => mockRows);
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: mockLimit,
          })),
        })),
      })),
    }));

    const { getUserPointsHistory } = await import("@/lib/admin/points");
    const result = await getUserPointsHistory("user-camila-demo");
    expect(result).toHaveLength(3);
    expect(mockLimit).toHaveBeenCalledWith(20);
  });

  it("accepts custom limit", async () => {
    const mockLimit = vi.fn(async () => []);
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: mockLimit,
          })),
        })),
      })),
    }));

    const { getUserPointsHistory } = await import("@/lib/admin/points");
    await getUserPointsHistory("user-camila-demo", 50);
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});
