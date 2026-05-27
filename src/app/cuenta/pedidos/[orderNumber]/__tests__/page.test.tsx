/**
 * Task 5.3 RED — /cuenta/pedidos/[orderNumber] detail page test (ORD-2, ORD-3, ORD-5)
 * - Line items render
 * - Shipment panel + /tracking/[trackingNumber] link when carrier=mock_courier
 * - notFound() called when null returned (ownership 404)
 * - params awaited as Promise (ORD-5)
 * - "Ver producto" CTA links to /productos/[slug] of first item (ORD-3 stub)
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
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(),
}));

const mockOrderDetail = {
  order: {
    id: "order-detail-1",
    orderNumber: "PET-DETAIL-001",
    userId: "user-a",
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "webpay_mock",
    total: 5000,
    subtotal: 5000,
    shippingCost: 0,
    address: { street: "Av. Principal 123", commune: "Santiago" },
    createdAt: new Date("2026-01-01"),
  },
  items: [
    {
      id: "item-1",
      name: "Comida Premium para Perros",
      quantity: 2,
      unitPrice: 2500,
      lineTotal: 5000,
      variantId: "var-1",
      productId: "prod-1",
      sku: "SKU-001",
      slug: "comida-premium-perros",
    },
  ],
  shipment: {
    id: "shipment-1",
    carrier: "mock_chilexpress",
    status: "en_ruta",
    trackingNumber: "TRACK-001",
    metadata: {},
    createdAt: new Date("2026-01-02"),
  },
};

vi.mock("@/app/actions/cuenta/pedidos", () => ({
  getOwnOrders: vi.fn(async () => []),
  getUserOrderDetailWithDb: vi.fn(),
  getOwnOrderDetail: vi.fn(async () => mockOrderDetail),
}));

import OrderDetailPage from "../page";

describe("/cuenta/pedidos/[orderNumber] page (ORD-2, ORD-3, ORD-5)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders line items from the order (ORD-2)", async () => {
    const jsx = await OrderDetailPage({
      params: Promise.resolve({ orderNumber: "PET-DETAIL-001" }),
    });
    render(jsx);
    expect(screen.getByText(/comida premium para perros/i)).toBeInTheDocument();
  });

  it("renders shipment panel with tracking link for carrier=mock_chilexpress (ORD-2)", async () => {
    const jsx = await OrderDetailPage({
      params: Promise.resolve({ orderNumber: "PET-DETAIL-001" }),
    });
    render(jsx);
    const trackingLink = screen.getByRole("link", { name: /seguimiento|tracking/i });
    expect(trackingLink).toHaveAttribute("href", "/tracking/TRACK-001");
  });

  it("calls notFound() when order is null — ownership 404 (ORD-2)", async () => {
    const { getOwnOrderDetail } = await import("@/app/actions/cuenta/pedidos");
    vi.mocked(getOwnOrderDetail).mockResolvedValueOnce(null);

    await expect(
      OrderDetailPage({ params: Promise.resolve({ orderNumber: "FOREIGN-ORDER" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("awaits params as Promise — no sync params access (ORD-5)", async () => {
    // This test verifies the component signature accepts Promise<{orderNumber}>
    // If it crashes here, params was accessed synchronously
    const jsx = await OrderDetailPage({
      params: Promise.resolve({ orderNumber: "PET-DETAIL-001" }),
    });
    render(jsx);
    expect(screen.getByText("PET-DETAIL-001")).toBeInTheDocument();
  });

  it("renders 'Ver producto' CTA linking to /producto/[slug] of first item (ORD-3)", async () => {
    const jsx = await OrderDetailPage({
      params: Promise.resolve({ orderNumber: "PET-DETAIL-001" }),
    });
    render(jsx);
    // The first item has slug "comida-premium-perros"; the page links to /producto/[slug]
    // (actual product route is /producto/[slug] — singular, not /productos/)
    const ctaLink = screen
      .getAllByRole("link")
      .find((l) => l.textContent?.includes("Ver producto"));
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink?.getAttribute("href")).toBe("/producto/comida-premium-perros");
  });

  it("does NOT show external tracking link for carrier=pickup", async () => {
    const { getOwnOrderDetail } = await import("@/app/actions/cuenta/pedidos");
    vi.mocked(getOwnOrderDetail).mockResolvedValueOnce({
      ...mockOrderDetail,
      shipment: { ...mockOrderDetail.shipment!, carrier: "pickup", trackingNumber: null },
    });
    const jsx = await OrderDetailPage({
      params: Promise.resolve({ orderNumber: "PET-DETAIL-001" }),
    });
    render(jsx);
    expect(screen.queryByRole("link", { name: /seguimiento|tracking/i })).not.toBeInTheDocument();
  });
});
