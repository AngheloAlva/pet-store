/**
 * Task 4.5 RED — /checkout/envio renders store picker inline when deliveryType = 'pickup'
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUser: mockGetCurrentUser }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((p: string) => { throw new Error(`REDIRECT:${p}`); }),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/app/actions/admin/settings", () => ({
  getAppSettings: vi.fn().mockResolvedValue({
    paymentFailureMode: false,
    coveredCommunes: null,
    freeShippingThreshold: 20000,
    dispatchSlots: null,
  }),
}));

vi.mock("@/db", () => ({
  dbReady: Promise.resolve(),
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

describe("/checkout/envio — pickup inline store picker", () => {
  it("renders store picker heading when deliveryType = pickup and no stores", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "u@test.cl", name: "U", role: "customer", storeId: null, isDemoSeed: false });

    const dbModule = await import("@/db");
    // First call: session; second call: stores
    let callCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dbModule.db as any).select = vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        const count = callCount++;
        const data = count === 0
          ? [{ id: "sess-envio-1", userId: "user-1", status: "active", deliveryType: "pickup", address: null, shippingOptionId: null, pickupStoreId: null, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }]
          : [];
        // Support both .from(table) directly awaited and .from(table).where(...)
        const chainable = {
          then: (resolve: (v: unknown) => unknown) => resolve(data),
          where: vi.fn().mockResolvedValue(data),
        };
        return chainable;
      }),
    }));

    const { default: EnvioPage } = await import("../page");
    render(await EnvioPage());

    // Should render a store picker section
    const storeTexts = screen.queryAllByText(/tienda|store|retiro/i);
    expect(storeTexts.length).toBeGreaterThan(0);
  });
});
