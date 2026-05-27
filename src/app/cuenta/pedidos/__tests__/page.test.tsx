/**
 * Task 5.1 RED — /cuenta/pedidos list page test (ORD-1)
 * - Renders table rows for 3 orders
 * - Empty state CTA links to /catalogo
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockOrders = [
  {
    id: "order-1",
    orderNumber: "PET-2026-001",
    userId: "user-a",
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "webpay_mock",
    total: 5000,
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "order-2",
    orderNumber: "PET-2026-002",
    userId: "user-a",
    status: "pending",
    paymentStatus: "unpaid",
    paymentGateway: "webpay_mock",
    total: 3000,
    createdAt: new Date("2026-01-02"),
  },
  {
    id: "order-3",
    orderNumber: "PET-2026-003",
    userId: "user-a",
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "webpay_mock",
    total: 7000,
    createdAt: new Date("2026-01-03"),
  },
];

vi.mock("@/app/actions/cuenta/pedidos", () => ({
  getOwnOrders: vi.fn(async () => mockOrders),
}));

import PedidosPage from "../page";

describe("/cuenta/pedidos page (ORD-1)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders table rows for 3 orders", async () => {
    const jsx = await PedidosPage();
    render(jsx);
    expect(screen.getByText("PET-2026-001")).toBeInTheDocument();
    expect(screen.getByText("PET-2026-002")).toBeInTheDocument();
    expect(screen.getByText("PET-2026-003")).toBeInTheDocument();
  });

  it("each order row links to its detail page", async () => {
    const jsx = await PedidosPage();
    render(jsx);
    const detailLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href")?.startsWith("/cuenta/pedidos/PET-2026"));
    expect(detailLinks.length).toBeGreaterThanOrEqual(3);
  });

  it("renders empty state with CTA to /catalogo when no orders (ORD-1)", async () => {
    const { getOwnOrders } = await import("@/app/actions/cuenta/pedidos");
    vi.mocked(getOwnOrders).mockResolvedValueOnce([]);
    const jsx = await PedidosPage();
    render(jsx);
    const cta = screen.getByRole("link", { name: /catalogo|catálogo/i });
    expect(cta).toHaveAttribute("href", "/catalogo");
  });
});
