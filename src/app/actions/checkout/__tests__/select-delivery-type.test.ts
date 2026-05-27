/**
 * Task 3.1 RED — select-delivery-type action tests
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("selectDeliveryType", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns UNAUTHENTICATED when no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { selectDeliveryType } = await import("../select-delivery-type");
    const result = await selectDeliveryType({ sessionId: "00000000-0000-0000-0000-000000000001", deliveryType: "despacho" });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });

  it("returns VALIDATION_ERROR for invalid deliveryType", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "u@test.cl", name: "U", role: "customer", storeId: null, isDemoSeed: false });
    const { selectDeliveryType } = await import("../select-delivery-type");
    const result = await selectDeliveryType({ sessionId: "00000000-0000-0000-0000-000000000001", deliveryType: "invalid_value" });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });

  it("returns SESSION_NOT_FOUND when session does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "u@test.cl", name: "U", role: "customer", storeId: null, isDemoSeed: false });
    const { selectDeliveryType } = await import("../select-delivery-type");
    const result = await selectDeliveryType({ sessionId: "00000000-0000-0000-0000-000000000001", deliveryType: "despacho" });
    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
  });
});
