/**
 * Task 6.1 RED→GREEN — PagoForm component tests.
 * Renders method selector with both gateway names.
 * Selecting MercadoPago renders installment selector.
 * Per-installment value updates on selection change.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";

// Mock server actions and session to prevent env var errors
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/app/actions/checkout/initiate-payment", () => ({
  initiatePayment: vi.fn(async () => ({ ok: true, token: "tok-1", redirectUrl: "/checkout/resultado?token=tok-1" })),
}));

vi.mock("@/app/actions/checkout/submit-transfer-receipt", () => ({
  submitTransferReceipt: vi.fn(async () => ({ ok: true, orderNumber: "PET-20260101-00001" })),
}));

describe("PagoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders method selector with WebPay and MercadoPago options", async () => {
    const { PagoForm } = await import("@/app/checkout/pago/pago-form");
    render(<PagoForm sessionId="sess-1" total={30000} />);

    // Both gateway names should be visible (at least one element each)
    const webpayElements = screen.getAllByText(/webpay/i);
    const mpElements = screen.getAllByText(/mercadopago/i);
    expect(webpayElements.length).toBeGreaterThan(0);
    expect(mpElements.length).toBeGreaterThan(0);
  });

  it("selecting MercadoPago renders installment selector label", async () => {
    const { PagoForm } = await import("@/app/checkout/pago/pago-form");
    render(<PagoForm sessionId="sess-1" total={30000} />);

    // Click on the MercadoPago selector button (first occurrence in the selector grid)
    const mpSelectorButton = screen.getAllByText(/mercadopago/i)[0];
    fireEvent.click(mpSelectorButton);

    // Installment label "Cantidad de cuotas" should appear
    await waitFor(() => {
      expect(screen.getByText(/cantidad de cuotas/i)).toBeInTheDocument();
    });
  });

  it("redirects to resultado with sessionId as paymentId (not gateway token)", async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);

    const { PagoForm } = await import("@/app/checkout/pago/pago-form");
    render(<PagoForm sessionId="sess-real-uuid" total={30000} />);

    // WebPay is the default selected method; click "Pagar con Webpay"
    const payBtn = screen.getByText(/pagar con webpay/i);
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(
        "/checkout/resultado?paymentId=sess-real-uuid&token=approve",
      );
    });
  });

  it("per-installment value shows 10000 CLP when 3 installments selected", async () => {
    const { PagoForm } = await import("@/app/checkout/pago/pago-form");
    render(<PagoForm sessionId="sess-1" total={30000} />);

    // Select MercadoPago
    const mpSelectorButton = screen.getAllByText(/mercadopago/i)[0];
    fireEvent.click(mpSelectorButton);

    // Click 3 installments button
    await waitFor(() => {
      expect(screen.getByText("3x")).toBeInTheDocument();
    });

    const btn3 = screen.getByText("3x");
    fireEvent.click(btn3);

    // 30000 / 3 = 10000 — formatted as CLP ($10.000)
    await waitFor(() => {
      const amountEl = screen.getByText(/\$10\.000|\$10,000/);
      expect(amountEl).toBeInTheDocument();
    });
  });
});
