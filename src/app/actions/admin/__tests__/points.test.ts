import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { revalidatePath } from "next/cache";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/notifications/demo-email", () => ({
  sendDemoEmail: vi.fn(async () => ({ id: "email-stub-id" })),
  DEMO_EMAIL_TEMPLATE: {
    POINTS_ADJUSTMENT: "points_adjustment",
  },
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRedirect = vi.mocked(redirect);
const mockRevalidatePath = vi.mocked(revalidatePath);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const adminUser = {
  id: "user-admin-demo",
  email: "admin@demo.cl",
  name: "Admin Demo",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: true,
};

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

const getActions = async () => {
  const m = await import("@/app/actions/admin/points");
  return m;
};

// ---------------------------------------------------------------------------
// addPointsTransaction
// ---------------------------------------------------------------------------
describe("addPointsTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-admin to /", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const actions = await getActions();
    await expect(
      actions.addPointsTransaction({
        userId: "user-camila-demo",
        deltaPoints: 100,
        description: "Test",
      }),
    ).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("computes balanceAfter correctly inside transaction (S-SCHEMA-2, S-ACTION-4)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    let insertedValues: Record<string, unknown> | null = null;
    const mockInsert = vi.fn(() => ({
      values: vi.fn(async (vals: Record<string, unknown>) => {
        insertedValues = vals;
        return {};
      }),
    }));

    // Mock transaction: select returns current balance=2500, then insert
    const mockSelectLatest = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => [{ balance: 2500 }]),
          })),
        })),
      })),
    }));

    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelectLatest, insert: mockInsert } as AnyDb),
    );

    const actions = await getActions();
    const result = await actions.addPointsTransaction({
      userId: "user-camila-demo",
      deltaPoints: 100,
      description: "Test adjustment",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.balanceAfter).toBe(2600); // 2500 + 100
    }
    expect(mockInsert).toHaveBeenCalled();
    // Verify createdBy is set to admin
    expect((insertedValues as unknown as Record<string, unknown>)?.createdBy).toBe("user-admin-demo");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/puntos");
  });

  it("starts from 0 when user has no prior transactions", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const mockInsert = vi.fn(() => ({
      values: vi.fn(async () => {}),
    }));
    const mockSelectLatest = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => []), // no prior txs
          })),
        })),
      })),
    }));

    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelectLatest, insert: mockInsert } as AnyDb),
    );

    const actions = await getActions();
    const result = await actions.addPointsTransaction({
      userId: "user-nobody",
      deltaPoints: 500,
      description: "First points",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.balanceAfter).toBe(500);
  });

  it("returns validation error for missing description", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const actions = await getActions();
    const result = await actions.addPointsTransaction({
      userId: "user-camila-demo",
      deltaPoints: 100,
      description: "",
    });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// recordPresentialPurchase
// ---------------------------------------------------------------------------
describe("recordPresentialPurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-admin to /", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const actions = await getActions();
    await expect(
      actions.recordPresentialPurchase({
        userId: "user-camila-demo",
        amountCLP: 35000,
        description: "Test purchase",
      }),
    ).rejects.toThrow(/REDIRECT:\//);
  });

  it("first purchase inserts both purchase and first_purchase_bonus txs (S-ACTION-5)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const insertedRows: Array<Record<string, unknown>> = [];
    const mockInsert = vi.fn(() => ({
      values: vi.fn(async (vals: Record<string, unknown>) => {
        insertedRows.push(vals);
        return {};
      }),
    }));

    // Simulate: no prior purchase txs, config returns earnRatePerCLP=100
    let selectCallCount = 0;
    const mockSelectTx = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => {
              // First call: get config
              // Actually, we mock differently based on table
              return [];
            }),
          })),
          limit: vi.fn(async () => {
            selectCallCount++;
            if (selectCallCount === 1) {
              // pointsConfig query
              return [
                {
                  earnRatePerCLP: 100,
                  firstPurchaseBonus: 500,
                  petBirthdayBonus: 200,
                  redeemValuePerPoint: 1,
                  minRedeemPoints: 500,
                },
              ];
            }
            return []; // no prior balance, no prior purchase txs
          }),
        })),
      })),
    }));

    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelectTx, insert: mockInsert } as AnyDb),
    );

    const actions = await getActions();
    const result = await actions.recordPresentialPurchase({
      userId: "user-camila-demo",
      amountCLP: 35000,
      description: "Compra presencial",
    });

    expect(result.ok).toBe(true);
    // Both purchase and first_purchase_bonus should be inserted
    expect(mockInsert).toHaveBeenCalledTimes(2);
    // Both should have createdBy = admin
    for (const row of insertedRows) {
      expect(row.createdBy).toBe("user-admin-demo");
    }
  });

  it("second purchase inserts only purchase tx (S-ACTION-6)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const insertedRows: Array<Record<string, unknown>> = [];
    const mockInsert = vi.fn(() => ({
      values: vi.fn(async (vals: Record<string, unknown>) => {
        insertedRows.push(vals);
        return {};
      }),
    }));

    // Has prior purchase tx
    let selectCallCount = 0;
    const mockSelectTx = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            selectCallCount++;
            if (selectCallCount === 1) {
              return [
                {
                  earnRatePerCLP: 100,
                  firstPurchaseBonus: 500,
                  petBirthdayBonus: 200,
                },
              ];
            }
            if (selectCallCount === 2) return [{ balanceAfter: 2500 }]; // prior balance
            return [{ id: "existing-purchase" }]; // prior purchase exists
          }),
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => [{ balanceAfter: 2500 }]),
          })),
        })),
      })),
    }));

    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelectTx, insert: mockInsert } as AnyDb),
    );

    const actions = await getActions();
    const result = await actions.recordPresentialPurchase({
      userId: "user-camila-demo",
      amountCLP: 10000,
      description: "Segunda compra",
    });

    expect(result.ok).toBe(true);
    // Only 1 insert (purchase, not first_purchase_bonus)
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(insertedRows[0].kind).toBe("purchase");
  });
});

// ---------------------------------------------------------------------------
// triggerPetBirthdayBonuses
// ---------------------------------------------------------------------------
describe("triggerPetBirthdayBonuses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-admin to /", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const actions = await getActions();
    await expect(actions.triggerPetBirthdayBonuses()).rejects.toThrow(/REDIRECT:\//);
  });

  it("grants bonus to eligible pet (S-ACTION-7)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const tobPet = {
      id: "pet-tobi-camila",
      userId: "user-camila-demo",
      birthDate: "2021-03-12",
    };

    let dbSelectCallCount = 0;
    // Main db.select: returns pets for birthday month
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          dbSelectCallCount++;
          if (dbSelectCallCount === 1) {
            // get config
            return [{ earnRatePerCLP: 100, firstPurchaseBonus: 500, petBirthdayBonus: 200 }];
          }
          // get pets with birthday in month
          return [tobPet];
        }),
      })),
    }));

    // Per-pet transaction: no existing bonus, insert tx
    const mockInsert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(async () => []), // no existing bonus
                orderBy: vi.fn(() => ({
                  limit: vi.fn(async () => [{ balanceAfter: 2500 }]),
                })),
              })),
            })),
          })),
          insert: mockInsert,
        } as AnyDb),
    );

    const actions = await getActions();
    const result = await actions.triggerPetBirthdayBonuses({ month: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.granted).toContain("pet-tobi-camila");
      expect(result.skipped).toHaveLength(0);
    }
  });

  it("skips pet that already has bonus this year (S-ACTION-8)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const tobPet = {
      id: "pet-tobi-camila",
      userId: "user-camila-demo",
      birthDate: "2021-03-12",
    };

    let dbSelectCallCount = 0;
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          dbSelectCallCount++;
          if (dbSelectCallCount === 1) {
            return [{ earnRatePerCLP: 100, firstPurchaseBonus: 500, petBirthdayBonus: 200 }];
          }
          return [tobPet];
        }),
      })),
    }));

    // Transaction: existing bonus found → skip
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(async () => [{ id: "existing-bonus-tx" }]), // already granted
              })),
            })),
          })),
          insert: vi.fn(() => ({ values: vi.fn(async () => ({})) })),
        } as AnyDb),
    );

    const actions = await getActions();
    const result = await actions.triggerPetBirthdayBonuses({ month: 3 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.granted).toHaveLength(0);
      expect(result.skipped).toContain("pet-tobi-camila");
    }
  });
});

// ---------------------------------------------------------------------------
// redeemPoints stub (S-ACTION-9)
// ---------------------------------------------------------------------------
describe("redeemPoints stub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(camilaUser);
  });

  it("returns exact not_implemented shape (S-ACTION-9)", async () => {
    const actions = await getActions();
    const result = await actions.redeemPoints({
      userId: "user-camila-demo",
      points: 500,
    });
    expect(result).toEqual({
      error: "not_implemented",
      message: "Redeem flow ships with Phase 3 checkout",
    });
  });

  it("writes zero DB rows", async () => {
    const mockInsert = vi.fn();
    (db as AnyDb).insert = mockInsert;

    const actions = await getActions();
    await actions.redeemPoints({ userId: "user-camila-demo", points: 500 });
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
