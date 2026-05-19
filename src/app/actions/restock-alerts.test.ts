import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
vi.mocked(redirect);
vi.mocked(revalidatePath);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

const getActions = async () => {
  const m = await import("./restock-alerts");
  return m;
};

// ---------------------------------------------------------------------------
// createRestockAlert
// ---------------------------------------------------------------------------
describe("createRestockAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no pending alert found (empty select)
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));
    (db as AnyDb).insert = vi.fn(() => ({
      values: vi.fn(async () => [{ id: "new-alert-id", cancelToken: "new-cancel-token" }]),
      returning: vi.fn(async () => [{ id: "new-alert-id", cancelToken: "new-cancel-token" }]),
    }));
  });

  it("S-ACTION-1: authenticated user — inserts with user email+id", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);

    const insertReturningMock = vi.fn(async () => [{ id: "alert-id", cancelToken: "tok-123" }]);
    const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }));
    (db as AnyDb).insert = vi.fn(() => ({
      values: insertValuesMock,
    }));

    const { createRestockAlert } = await getActions();
    const result = await createRestockAlert({ productId: "prod-1" });

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.alertId).toBeDefined();
    }
    // Should have called insert (no duplicate found in select)
    expect((db as AnyDb).insert).toHaveBeenCalled();
  });

  it("S-ACTION-2: anonymous missing email → {ok:false, errors}", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { createRestockAlert } = await getActions();
    const result = await createRestockAlert({ productId: "prod-1" });

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.errors).toBeDefined();
    }
  });

  it("S-ACTION-3: pending dedupe — returns existing alertId, no new insert", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    // Return existing pending alert
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "existing-alert", cancelToken: "existing-token", status: "pending" }]),
      })),
    }));

    const { createRestockAlert } = await getActions();
    const result = await createRestockAlert({ productId: "prod-1", email: "a@b.com" });

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.alertId).toBe("existing-alert");
      expect(result.cancelToken).toBe("existing-token");
    }
    // insert should NOT have been called (dedupe)
    expect((db as AnyDb).insert).not.toHaveBeenCalled();
  });

  it("S-ACTION-4: fired row → new insert allowed (no dedupe)", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    // Select returns empty (no pending alert found — the fired row doesn't count)
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));

    const insertReturningMock = vi.fn(async () => [{ id: "new-alert", cancelToken: "new-tok" }]);
    const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }));
    (db as AnyDb).insert = vi.fn(() => ({ values: insertValuesMock }));

    const { createRestockAlert } = await getActions();
    const result = await createRestockAlert({ productId: "prod-1", email: "a@b.com" });

    expect(result).toMatchObject({ ok: true });
    expect((db as AnyDb).insert).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// cancelRestockAlert
// ---------------------------------------------------------------------------
describe("cancelRestockAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as AnyDb).update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => ({})),
      })),
    }));
  });

  it("S-ACTION-5: cancel own alert by alertId → canceled", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);

    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "alert-own", userId: "user-camila-demo", status: "pending" }]),
      })),
    }));

    const { cancelRestockAlert } = await getActions();
    const result = await cancelRestockAlert({ kind: "id", alertId: "alert-own" });

    expect(result).toMatchObject({ ok: true });
    expect((db as AnyDb).update).toHaveBeenCalled();
  });

  it("S-ACTION-6: forbidden — different user's alert → {ok:false, error:'forbidden'}", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);

    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "alert-other", userId: "user-other-id", status: "pending" }]),
      })),
    }));

    const { cancelRestockAlert } = await getActions();
    const result = await cancelRestockAlert({ kind: "id", alertId: "alert-other" });

    expect(result).toMatchObject({ ok: false, error: "forbidden" });
    expect((db as AnyDb).update).not.toHaveBeenCalled();
  });

  it("S-ACTION-7: token cancel anonymous → canceled", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "alert-tok", cancelToken: "tok-xyz", status: "pending" }]),
      })),
    }));

    const { cancelRestockAlert } = await getActions();
    const result = await cancelRestockAlert({ kind: "token", token: "tok-xyz" });

    expect(result).toMatchObject({ ok: true });
    expect((db as AnyDb).update).toHaveBeenCalled();
  });

  it("S-ACTION-8: already canceled → {ok:false, error:'already_canceled'}", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);

    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "alert-done", userId: "user-camila-demo", status: "canceled" }]),
      })),
    }));

    const { cancelRestockAlert } = await getActions();
    const result = await cancelRestockAlert({ kind: "id", alertId: "alert-done" });

    expect(result).toMatchObject({ ok: false, error: "already_canceled" });
  });
});
