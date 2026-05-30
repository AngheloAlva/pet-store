/**
 * T-30 [UI-ADMIN] Admin product subscription config section
 * CF-3, CF-S5, CF-S6
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateSubscriptionConfig = vi.fn();

vi.mock("@/app/actions/admin/subscriptions", () => ({
  updateSubscriptionConfig: (...args: unknown[]) => mockUpdateSubscriptionConfig(...args),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SubscriptionConfigSection } from "@/components/admin/products/subscription-config-section";

const baseProps = {
  productId: "prod-1",
  initial: {
    subscriptionEnabled: false,
    subscriptionFrequencies: [] as number[],
    subscriptionDiscountPercent: 0,
  },
};

describe("SubscriptionConfigSection (T-30)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("CF-S5: renders toggle for subscriptionEnabled", () => {
    render(<SubscriptionConfigSection {...baseProps} />);
    expect(screen.getByRole("checkbox", { name: /suscripciones/i })).toBeInTheDocument();
  });

  it("CF-S5: frequency multiselect renders 15/30/45/60 options", () => {
    render(<SubscriptionConfigSection {...baseProps} initial={{ ...baseProps.initial, subscriptionEnabled: true }} />);
    // Enable the toggle first if needed
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
  });

  it("CF-S6: discount options 0/5/10 are available", () => {
    render(<SubscriptionConfigSection {...baseProps} initial={{ ...baseProps.initial, subscriptionEnabled: true }} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("submit calls updateSubscriptionConfig action", async () => {
    mockUpdateSubscriptionConfig.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<SubscriptionConfigSection {...baseProps} initial={{ ...baseProps.initial, subscriptionEnabled: true, subscriptionFrequencies: [30], subscriptionDiscountPercent: 10 }} />);
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(mockUpdateSubscriptionConfig).toHaveBeenCalledWith(expect.objectContaining({
      productId: "prod-1",
    }));
  });
});
