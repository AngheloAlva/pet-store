import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductPurchasePanel } from "./product-purchase-panel";
import { useCartStore } from "@/stores/cart";
import { getProductBySlug } from "@/lib/catalog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/app/actions/restock-alerts", () => ({
  createRestockAlert: vi.fn(async () => ({ ok: true, alertId: "alert-id", cancelToken: "tok-1" })),
}));

describe("ProductPurchasePanel", () => {
  beforeEach(() => useCartStore.getState().clear());

  it("selects the first variant by default", () => {
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<ProductPurchasePanel product={product} />);
    const firstBtn = screen.getByRole("button", { name: /3 kg/i });
    expect(firstBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("updates price display when a different variant is clicked", async () => {
    const user = userEvent.setup();
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<ProductPurchasePanel product={product} />);
    // Default variant 3 kg → $24.990 appears at least once
    expect(screen.getAllByText(/\$24\.990/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /^15 kg$/i }));
    expect(screen.getAllByText(/\$79\.990/).length).toBeGreaterThan(0);
  });

  it("dispatches add-to-cart with selected variant and quantity", async () => {
    const user = userEvent.setup();
    const product = getProductBySlug("royal-canin-medium-adult")!;
    render(<ProductPurchasePanel product={product} />);
    await user.click(screen.getByRole("button", { name: /^8 kg$/i }));
    await user.click(screen.getByRole("button", { name: /aumentar cantidad/i }));
    // The desktop button has text "Agregar al carrito"; the sticky mobile
    // button has text "Agregar" with aria-label="Agregar al carrito". Both
    // match by accessible name, so dispatch via either and assert one item.
    const buttons = screen.getAllByRole("button", { name: /agregar al carrito/i });
    await user.click(buttons[0]);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: product.id,
      variantId: "rc-ma-8",
      quantity: 2,
    });
  });
});
