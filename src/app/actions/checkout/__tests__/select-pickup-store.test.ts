/**
 * Task 3.3 RED — select-pickup-store action tests (spec CO-2a)
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("selectPickupStore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns UNAUTHENTICATED when no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { selectPickupStore } = await import("../select-pickup-store");
    const result = await selectPickupStore({ sessionId: "00000000-0000-0000-0000-000000000001", storeId: "store-1" });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });

  it("returns VALIDATION_ERROR when storeId is missing", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "u@test.cl", name: "U", role: "customer", storeId: null, isDemoSeed: false });
    const { selectPickupStore } = await import("../select-pickup-store");
    const result = await selectPickupStore({ sessionId: "00000000-0000-0000-0000-000000000001", storeId: "" });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });

  it("returns SESSION_NOT_FOUND when session does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "u@test.cl", name: "U", role: "customer", storeId: null, isDemoSeed: false });
    const { selectPickupStore } = await import("../select-pickup-store");
    const result = await selectPickupStore({ sessionId: "00000000-0000-0000-0000-000000000001", storeId: "store-1" });
    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
  });
});
