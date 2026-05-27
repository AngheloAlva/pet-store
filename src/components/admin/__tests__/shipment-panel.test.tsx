/**
 * Task 6.3 RED — ShipmentPanel component tests.
 * AO-1a: Panel renders carrier, status, and latest event.
 * AO-2b: Terminal status (entregado) disables the advance button.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockAdvance = vi.fn();

vi.mock("@/app/actions/admin/shipments", () => ({
  advanceShipmentStatus: (id: string, status: string) => mockAdvance(id, status),
}));

import { ShipmentPanel } from "../shipment-panel";

const baseShipment = {
  id: "ship-1",
  carrier: "propio" as const,
  status: "preparando" as const,
  trackingNumber: null,
  orderId: "order-1",
};

const baseEvents = [
  {
    id: "ev-1",
    shipmentId: "ship-1",
    status: "preparando" as const,
    description: "Pedido recibido y en preparación",
    timestamp: new Date("2026-05-27T10:00:00Z"),
  },
];

describe("ShipmentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdvance.mockResolvedValue({ ok: true, newStatus: "en_ruta" });
  });

  it("AO-1a: renders carrier, status, and latest event description", () => {
    render(<ShipmentPanel shipment={baseShipment} events={baseEvents} />);

    expect(screen.getByText(/propio/i)).toBeInTheDocument();
    expect(screen.getByText(/preparando/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedido recibido/i)).toBeInTheDocument();
  });

  it("AO-2a: clicking Avanzar estado calls advanceShipmentStatus", async () => {
    render(<ShipmentPanel shipment={baseShipment} events={baseEvents} />);

    const btn = screen.getByRole("button", { name: /avanzar/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalledWith("ship-1", expect.any(String));
    });
  });

  it("AO-2b: terminal status (entregado) disables the advance button", () => {
    render(
      <ShipmentPanel
        shipment={{ ...baseShipment, status: "entregado" }}
        events={baseEvents}
      />,
    );

    const btn = screen.queryByRole("button", { name: /avanzar/i });
    // Either no button or disabled button
    if (btn) {
      expect(btn).toBeDisabled();
    } else {
      expect(btn).toBeNull();
    }
  });

  it("AO-2b: terminal status (fallido) disables the advance button", () => {
    render(
      <ShipmentPanel
        shipment={{ ...baseShipment, status: "fallido" }}
        events={baseEvents}
      />,
    );

    const btn = screen.queryByRole("button", { name: /avanzar/i });
    if (btn) {
      expect(btn).toBeDisabled();
    } else {
      expect(btn).toBeNull();
    }
  });

  it("renders trackingNumber when present", () => {
    render(
      <ShipmentPanel
        shipment={{ ...baseShipment, trackingNumber: "MOCK-ABCD1234" }}
        events={baseEvents}
      />,
    );

    expect(screen.getByText(/MOCK-ABCD1234/)).toBeInTheDocument();
  });
});
