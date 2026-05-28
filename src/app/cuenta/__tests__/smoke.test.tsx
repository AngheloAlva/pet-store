/**
 * Phase 9 — F3.4 Cuenta smoke integration test
 *
 * Verifies the cuenta hub → sidebar → pedidos/direcciones navigation round trip.
 * Uses mocked actions and components to exercise the page tree without a live DB.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Shared mocks
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  usePathname: vi.fn(() => "/cuenta"),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/app/actions/cuenta/pedidos", () => ({
  getOwnOrders: vi.fn(async () => [
    {
      id: "order-smoke-1",
      orderNumber: "PET-SMOKE-001",
      userId: "user-camila-demo",
      status: "completed",
      paymentStatus: "paid",
      paymentGateway: "webpay_mock",
      total: 50000,
      createdAt: new Date("2026-02-10"),
    },
  ]),
}));
vi.mock("@/app/actions/cuenta/direcciones", () => ({
  listAddresses: vi.fn(async () => []),
}));

import { getCurrentUser } from "@/lib/session";
import CuentaLayout from "../(hub)/layout";
import CuentaPage from "../(hub)/page";
import PedidosPage from "../(hub)/pedidos/page";
import DireccionesPage from "../(hub)/direcciones/page";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

describe("Cuenta hub smoke tests (F3.4)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("layout renders sidebar + children for authenticated user", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CuentaLayout({ children: <div data-testid="child">page</div> });
    render(jsx);

    // Sidebar present
    expect(screen.getByRole("navigation", { name: /mi cuenta/i })).toBeInTheDocument();
    // Children rendered
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("hub page renders sections linking to pedidos, puntos, and citas (HUB-3)", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await CuentaPage();
    render(jsx);

    // Hub links to pedidos, puntos, citas
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/cuenta/pedidos");
    expect(hrefs).toContain("/cuenta/puntos");
    expect(hrefs).toContain("/cuenta/citas");
  });

  it("pedidos page shows the demo order row", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await PedidosPage();
    render(jsx);

    expect(screen.getByText("PET-SMOKE-001")).toBeInTheDocument();
  });

  it("direcciones page shows empty state with Agregar button when no addresses", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const jsx = await DireccionesPage();
    render(jsx);

    // Empty state should be present
    const body = document.body.textContent?.toLowerCase() ?? "";
    expect(body).toMatch(/agregar|no tienes/i);
  });
});
