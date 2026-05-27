/**
 * Task 4.3 RED — checkout/page.tsx redirect logic
 * - no deliveryType → redirect to /tipo-entrega
 * - pickup → skip /entrega, go to /envio
 * - despacho with address → go to /envio
 */
import { describe, it, expect, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUser: mockGetCurrentUser }));

const mockRedirect = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); });
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const mockDbSelect = vi.fn();
vi.mock("@/db", () => ({
  dbReady: Promise.resolve(),
  db: {
    select: mockDbSelect,
  },
}));

describe("checkout/page.tsx redirect logic", () => {
  beforeEach = vi.fn(() => {});

  it("redirects to /carrito when no active session", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "u@test.cl", name: "U", role: "customer", storeId: null, isDemoSeed: false });
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { default: CheckoutPage } = await import("@/app/checkout/page");

    await expect(CheckoutPage()).rejects.toThrow("REDIRECT:/carrito");
  });

  it("redirects to /checkout/tipo-entrega when no deliveryType", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "u@test.cl", name: "U", role: "customer", storeId: null, isDemoSeed: false });
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "sess-1",
            userId: "user-1",
            status: "active",
            deliveryType: null,
            address: null,
            shippingOptionId: null,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        ]),
      }),
    });

    const { default: CheckoutPage } = await import("@/app/checkout/page");

    await expect(CheckoutPage()).rejects.toThrow("REDIRECT:/checkout/tipo-entrega");
  });

  it("redirects pickup (no address) directly to /checkout/envio", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1", email: "u@test.cl", name: "U", role: "customer", storeId: null, isDemoSeed: false });
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "sess-2",
            userId: "user-1",
            status: "active",
            deliveryType: "pickup",
            address: null,
            shippingOptionId: null,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        ]),
      }),
    });

    const { default: CheckoutPage } = await import("@/app/checkout/page");

    await expect(CheckoutPage()).rejects.toThrow("REDIRECT:/checkout/envio");
  });
});
