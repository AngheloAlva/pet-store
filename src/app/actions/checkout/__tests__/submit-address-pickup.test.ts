/**
 * Task 3.5 RED — submit-address: null address allowed when deliveryType = 'pickup'
 * required when despacho/courier.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("submitAddress — pickup bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      id: "user-pickup-1",
      email: "pickup@test.cl",
      name: "Pickup User",
      role: "customer",
      storeId: null,
      isDemoSeed: false,
    });
  });

  it("returns COMMUNE_NOT_COVERED when address provided and commune is not covered (despacho path)", async () => {
    const dbModule = await import("@/db");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dbModule.db as any).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "00000000-0000-0000-0000-000000000001",
            userId: "user-pickup-1",
            status: "active",
            deliveryType: "despacho",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        ]),
      }),
    });

    const { submitAddress } = await import("../submit-address");
    const result = await submitAddress({
      sessionId: "00000000-0000-0000-0000-000000000001",
      address: {
        recipientName: "Test User",
        street: "Av Las Heras",
        number: "1234",
        commune: "Temuco", // not covered
        region: "IX",
        phone: "+56912345678",
      },
    });

    expect(result).toMatchObject({ ok: false, code: "COMMUNE_NOT_COVERED" });
  });
});
