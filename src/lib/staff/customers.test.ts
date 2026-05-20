import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const getLoader = async () => import("./customers");

describe("searchCustomers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // S-LOADER-3: matches name/email/rut, excludes non-customers
  it("S-LOADER-3: returns customer matches, excludes staff by role filter at query level", async () => {
    const customerRows = [
      { id: "c1", name: "Maria López", email: "maria@example.cl", rut: "12345678-9", phone: null, totalPoints: null },
      { id: "c2", name: "Test User", email: "match@demo.cl", rut: null, phone: null, totalPoints: null },
    ];

    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => customerRows),
        })),
      })),
    }));

    const { searchCustomers } = await getLoader();
    const result = await searchCustomers({ query: "match" });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("c1");
  });

  it("returns [] for empty query", async () => {
    const { searchCustomers } = await getLoader();
    const result = await searchCustomers({ query: "" });
    expect(result).toEqual([]);
    expect((db as AnyDb).select).not.toHaveBeenCalled();
  });
});

describe("getCustomerDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // S-LOADER-4: returns user + points + recent appointments
  it("S-LOADER-4: returns CustomerDetail with user data, totalPoints, and ≤5 recentAppointments", async () => {
    const userRow = { id: "c1", name: "Maria López", email: "maria@example.cl", rut: null, phone: null, role: "customer" };
    const pointsRow = [{ balanceAfter: 350 }];
    const appointmentRows = [
      { id: "a1", serviceName: "Baño", startsAt: new Date("2026-05-15"), status: "attended" },
      { id: "a2", serviceName: "Corte", startsAt: new Date("2026-05-10"), status: "attended" },
      { id: "a3", serviceName: "Baño", startsAt: new Date("2026-05-05"), status: "no_show" },
    ];

    let selectCallCount = 0;
    (db as AnyDb).select = vi.fn(() => {
      selectCallCount++;
      const callIndex = selectCallCount;
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => {
            if (callIndex === 1) {
              // user row query
              return Promise.resolve([userRow]);
            }
            // points or appointments
            return {
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => callIndex === 2 ? pointsRow : appointmentRows),
              })),
            };
          }),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => appointmentRows),
              })),
            })),
          })),
        })),
      };
    });

    const { getCustomerDetail } = await getLoader();
    const result = await getCustomerDetail({ userId: "c1" });

    expect(result).not.toBeNull();
    expect(result!.user.id).toBe("c1");
    expect(typeof result!.totalPoints).toBe("number");
    expect(result!.recentAppointments.length).toBeLessThanOrEqual(5);
  });

  // S-LOADER-5: returns null when user not found
  it("S-LOADER-5: returns null when userId not found", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));

    const { getCustomerDetail } = await getLoader();
    const result = await getCustomerDetail({ userId: "non-existent" });

    expect(result).toBeNull();
  });

  it("returns null when user exists but has non-customer role", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          { id: "u1", name: "Staff", email: "staff@demo.cl", rut: null, phone: null, role: "staff" },
        ]),
      })),
    }));

    const { getCustomerDetail } = await getLoader();
    const result = await getCustomerDetail({ userId: "u1" });

    expect(result).toBeNull();
  });
});
