/**
 * T-25 [UI] PDP subscription toggle + frequency selector + discounted price display
 * SP-S1, SP-S6, SP-S2, SP-S3
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { useCartStore } from "@/stores/cart";
import type { Product } from "@/types";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/app/actions/restock-alerts", () => ({
  createRestockAlert: vi.fn(async () => ({ ok: true, alertId: "alert-id", cancelToken: "tok-1" })),
}));

// A product with subscriptions enabled
const subProduct: Product = {
  id: "sub-prod-1",
  slug: "sub-prod-1",
  name: "Premium Dog Food",
  brandId: "royal-canin",
  categoryIds: ["alimentos-perros"],
  species: ["dog"],
  description: "A great food",
  images: [{ url: "https://example.com/img.jpg", alt: "Product" }],
  tags: [],
  variants: [
    {
      id: "sub-var-1",
      sku: "SPF-001",
      name: "2 kg",
      quantity: { value: 2, unit: "kg" },
      price: { amount: 20000, currency: "CLP" },
    },
    {
      id: "sub-var-2",
      sku: "SPF-002",
      name: "5 kg",
      quantity: { value: 5, unit: "kg" },
      price: { amount: 45000, currency: "CLP" },
    },
  ],
  subscriptionEnabled: true,
  subscriptionFrequencies: [30, 60],
  subscriptionDiscountPercent: 10,
};

// A product with subscriptions disabled
const noSubProduct: Product = {
  ...subProduct,
  id: "no-sub-prod-1",
  slug: "no-sub-prod-1",
  subscriptionEnabled: false,
  subscriptionFrequencies: [],
  subscriptionDiscountPercent: 0,
};

describe("ProductPurchasePanel — subscription toggle (T-25)", () => {
  beforeEach(() => useCartStore.getState().clear());

  it("SP-S1: subscription toggle is visible for subscription-enabled product", () => {
    render(<ProductPurchasePanel product={subProduct} />);
    // Should show radio/toggle options for purchase type
    expect(screen.getByText(/suscribirme/i)).toBeInTheDocument();
    expect(screen.getByText(/compra única/i)).toBeInTheDocument();
  });

  it("SP-S6: no subscription toggle for subscription-disabled product", () => {
    render(<ProductPurchasePanel product={noSubProduct} />);
    expect(screen.queryByText(/suscribirme/i)).not.toBeInTheDocument();
  });

  it("SP-S2: discounted price is shown when subscription option is selected", async () => {
    const user = userEvent.setup();
    render(<ProductPurchasePanel product={subProduct} />);

    // Click "Suscribirme"
    await user.click(screen.getByText(/suscribirme/i));

    // 10% off 20000 = 18000
    expect(screen.getByText(/\$18\.000/)).toBeInTheDocument();
  });

  it("SP-S3: frequency selector shows all configured frequencies", async () => {
    const user = userEvent.setup();
    render(<ProductPurchasePanel product={subProduct} />);

    await user.click(screen.getByText(/suscribirme/i));

    // Should show "Cada 30 días" and "Cada 60 días"
    expect(screen.getByText(/cada 30 días/i)).toBeInTheDocument();
    expect(screen.getByText(/cada 60 días/i)).toBeInTheDocument();
  });

  it("reverts to full price when switching back to one-time purchase", async () => {
    const user = userEvent.setup();
    render(<ProductPurchasePanel product={subProduct} />);

    // Switch to subscription
    await user.click(screen.getByText(/suscribirme/i));
    // Should show discounted price
    expect(screen.getByText(/\$18\.000/)).toBeInTheDocument();

    // Switch back to one-time
    await user.click(screen.getByText(/compra única/i));
    // Should show full price again (not the discounted one)
    expect(screen.queryByText(/\$18\.000/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/\$20\.000/).length).toBeGreaterThan(0);
  });
});
