/**
 * Task 4.5 RED — selectShipping action test.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("selectShipping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns UNAUTHENTICATED when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { selectShipping } = await import("@/app/actions/checkout/select-shipping");

    const result = await selectShipping({
      sessionId: "00000000-0000-0000-0000-000000000001",
      shippingOptionId: "standard",
    });

    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });

  it("returns SESSION_NOT_FOUND when session does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "u@test.cl",
      name: "User",
      role: "customer",
      storeId: null,
      isDemoSeed: false,
    });

    const { selectShipping } = await import("@/app/actions/checkout/select-shipping");

    const result = await selectShipping({
      sessionId: "00000000-0000-0000-0000-000000000001",
      shippingOptionId: "standard",
    });

    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
  });

  it("returns INVALID_SHIPPING_OPTION for unknown option", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user-2",
      email: "u2@test.cl",
      name: "User2",
      role: "customer",
      storeId: null,
      isDemoSeed: false,
    });

    const dbModule = await import("@/db");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dbModule.db as any).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "00000000-0000-0000-0000-000000000002",
            userId: "user-2",
            status: "active",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            address: { commune: "Santiago" },
            shippingOptionId: null,
            shippingCost: null,
            cartSnapshot: [],
            idempotencyKey: "idem-2",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    });

    const { selectShipping } = await import("@/app/actions/checkout/select-shipping");

    const result = await selectShipping({
      sessionId: "00000000-0000-0000-0000-000000000002",
      shippingOptionId: "nonexistent-option",
    });

    expect(result).toMatchObject({ ok: false, code: "INVALID_SHIPPING_OPTION" });
  });
});
