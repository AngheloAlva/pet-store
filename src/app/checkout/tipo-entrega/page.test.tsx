/**
 * Task 4.1 RED — /checkout/tipo-entrega page test
 * Renders three delivery method options; selecting 'retiro' sets deliveryType = 'pickup'.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUser: mockGetCurrentUser }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/db", () => ({
  dbReady: Promise.resolve(),
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "sess-tipo-entrega-1",
            userId: "user-1",
            status: "active",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            deliveryType: null,
          },
        ]),
      }),
    }),
  },
}));

describe("/checkout/tipo-entrega page", () => {
  it("renders three delivery method options", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "u@test.cl",
      name: "U",
      role: "customer",
      storeId: null,
      isDemoSeed: false,
    });

    const { default: TipoEntregaPage } = await import("./page");

    render(await TipoEntregaPage());

    // Should render options for despacho, retiro, courier
    expect(screen.getByText(/despacho a domicilio/i)).toBeInTheDocument();
    expect(screen.getByText(/retiro en tienda/i)).toBeInTheDocument();
    expect(screen.getByText(/envío a regiones/i)).toBeInTheDocument();
  });
});
