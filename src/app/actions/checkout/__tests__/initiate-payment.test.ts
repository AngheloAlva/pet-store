/**
 * Task 4.7 RED — initiatePayment action test.
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

describe("initiatePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns UNAUTHENTICATED when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { initiatePayment } = await import("@/app/actions/checkout/initiate-payment");

    const result = await initiatePayment({
      sessionId: "00000000-0000-0000-0000-000000000001",
      gateway: "webpay_mock",
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

    const { initiatePayment } = await import("@/app/actions/checkout/initiate-payment");

    const result = await initiatePayment({
      sessionId: "00000000-0000-0000-0000-000000000001",
      gateway: "webpay_mock",
    });

    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
  });

  it("returns ADDRESS_MISSING when address is not set on session", async () => {
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
            address: null, // missing address
            shippingOptionId: "standard",
            shippingCost: 3990,
            cartSnapshot: [],
            idempotencyKey: "idem-2",
            gatewayToken: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    });

    const { initiatePayment } = await import("@/app/actions/checkout/initiate-payment");

    const result = await initiatePayment({
      sessionId: "00000000-0000-0000-0000-000000000002",
      gateway: "webpay_mock",
    });

    expect(result).toMatchObject({ ok: false, code: "ADDRESS_MISSING" });
  });

  it("returns SHIPPING_MISSING when shipping is not selected", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user-3",
      email: "u3@test.cl",
      name: "User3",
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
            id: "00000000-0000-0000-0000-000000000003",
            userId: "user-3",
            status: "active",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            address: { commune: "Santiago" }, // has address
            shippingOptionId: null, // missing shipping
            shippingCost: null,
            cartSnapshot: [],
            idempotencyKey: "idem-3",
            gatewayToken: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    });

    const { initiatePayment } = await import("@/app/actions/checkout/initiate-payment");

    const result = await initiatePayment({
      sessionId: "00000000-0000-0000-0000-000000000003",
      gateway: "webpay_mock",
    });

    expect(result).toMatchObject({ ok: false, code: "SHIPPING_MISSING" });
  });
});
