/**
 * Task 4.3 RED — submitAddress action test.
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

const validAddress = {
  recipientName: "Ana García",
  street: "Av. Providencia",
  number: "1234",
  commune: "Providencia",
  region: "Región Metropolitana",
  phone: "+56912345678",
};

describe("submitAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns UNAUTHENTICATED when user is not logged in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { submitAddress } = await import("@/app/actions/checkout/submit-address");

    const result = await submitAddress({
      sessionId: crypto.randomUUID(),
      address: validAddress,
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

    const { submitAddress } = await import("@/app/actions/checkout/submit-address");

    const result = await submitAddress({
      sessionId: "00000000-0000-0000-0000-000000000001", // valid UUID, no row in mock db
      address: validAddress,
    });

    expect(result).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
  });

  it("returns COMMUNE_NOT_COVERED for unsupported commune", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "u@test.cl",
      name: "User",
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
            userId: "user-1",
            status: "active",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            address: null,
            shippingOptionId: null,
            shippingCost: null,
            cartSnapshot: [],
            idempotencyKey: "idem-1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    });

    const { submitAddress } = await import("@/app/actions/checkout/submit-address");

    const result = await submitAddress({
      sessionId: "00000000-0000-0000-0000-000000000002", // valid UUID
      address: { ...validAddress, commune: "Antártica Chilena" },
    });

    expect(result).toMatchObject({ ok: false, code: "COMMUNE_NOT_COVERED" });
  });
});
