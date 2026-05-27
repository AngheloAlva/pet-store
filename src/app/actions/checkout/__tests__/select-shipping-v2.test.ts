/**
 * Task 3.7 RED — select-shipping: commune + deliveryType; dispatchSlot for propio;
 * blocks non-covered commune for propio (spec CO-4a).
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("selectShipping — delivery-type aware (v2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: "user-ss-1",
      email: "ss@test.cl",
      name: "SS User",
      role: "customer",
      storeId: null,
      isDemoSeed: false,
    });
  });

  it("returns UNAUTHENTICATED when no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { selectShipping } = await import("../select-shipping");
    const result = await selectShipping({ sessionId: "00000000-0000-0000-0000-000000000001", shippingOptionId: "propio" });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });

  it("returns SESSION_NOT_FOUND when session does not exist", async () => {
    const { selectShipping } = await import("../select-shipping");
    const result = await selectShipping({ sessionId: "00000000-0000-0000-0000-000000000001", shippingOptionId: "propio", dispatchSlot: "tarde" });
    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
  });

  // CO-3a: slot required for propio
  it("CO-3a: propio without dispatchSlot → VALIDATION_ERROR", async () => {
    const { selectShipping } = await import("../select-shipping");
    const result = await selectShipping({
      sessionId: "00000000-0000-0000-0000-000000000001",
      shippingOptionId: "propio",
      // dispatchSlot intentionally omitted
    });
    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
  });

  it("CO-3a bonus: mock_chilexpress without dispatchSlot → proceeds past validation (SESSION_NOT_FOUND, not VALIDATION_ERROR)", async () => {
    const { selectShipping } = await import("../select-shipping");
    const result = await selectShipping({
      sessionId: "00000000-0000-0000-0000-000000000001",
      shippingOptionId: "mock_chilexpress",
      // dispatchSlot not required for non-propio
    });
    // Should fail at SESSION_NOT_FOUND, not at VALIDATION_ERROR
    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
  });
});
