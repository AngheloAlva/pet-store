import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartLineItem } from "./cart-line-item";
import { useCartStore, type CartItem } from "@/stores/cart";

vi.mock("@/lib/stock", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stock")>("@/lib/stock");
  return {
    ...actual,
    getVariantTotalStock: vi.fn(() => 99),
  };
});

const baseItem: CartItem = {
  productId: "p1",
  variantId: "v1",
  name: "Pro Plan Adulto 15kg",
  variantName: "15 kg",
  image: "/img.jpg",
  unitPrice: 4990,
  quantity: 2,
  slug: "pro-plan-adulto",
};

describe("CartLineItem", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useCartStore.getState().addItem({ ...baseItem }, baseItem.quantity);
  });

  it("renders name as a link to the product page", () => {
    render(<CartLineItem item={baseItem} />);
    const link = screen.getByRole("link", { name: /pro plan adulto 15kg/i });
    expect(link).toHaveAttribute("href", "/producto/pro-plan-adulto");
  });

  it("renders the variant label", () => {
    render(<CartLineItem item={baseItem} />);
    expect(screen.getByText("15 kg")).toBeInTheDocument();
  });

  it("renders the line total formatted in CLP", () => {
    render(<CartLineItem item={baseItem} />);
    // 4990 * 2 = 9980
    expect(screen.getByText(/\$\s*9\.980/)).toBeInTheDocument();
  });

  it("updates quantity when the stepper is incremented", async () => {
    const user = userEvent.setup();
    render(<CartLineItem item={baseItem} />);
    await user.click(screen.getByRole("button", { name: /aumentar cantidad/i }));
    const updated = useCartStore.getState().items[0];
    expect(updated.quantity).toBe(3);
  });

  it("removes the line when the remove button is clicked", async () => {
    const user = userEvent.setup();
    render(<CartLineItem item={baseItem} />);
    await user.click(
      screen.getByRole("button", { name: /quitar pro plan adulto 15kg del carrito/i }),
    );
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
